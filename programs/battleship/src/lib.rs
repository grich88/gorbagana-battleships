use anchor_lang::prelude::*;
use anchor_lang::solana_program::hash::hash;

declare_id!("DRJk4gJFdYCCHNYY5qFZfrM9ysNrMz3kXJN5JVZdz8Jm");

#[program]
pub mod battleship {
    use super::*;

    pub fn initialize_game(ctx: Context<InitializeGame>, board_commitment: [u8; 32]) -> Result<()> {
        let game = &mut ctx.accounts.game;
        
        game.player1 = ctx.accounts.player.key();
        game.player2 = Pubkey::default(); // Will be set when second player joins
        game.board_commit1 = board_commitment;
        game.board_commit2 = [0; 32]; // Will be set when player2 joins
        game.turn = 1; // Player1 starts
        game.board_hits1 = [0; 100]; // 10x10 grid for hits on player1's board
        game.board_hits2 = [0; 100]; // 10x10 grid for hits on player2's board
        game.hits_count1 = 0; // How many hits player1's fleet has taken
        game.hits_count2 = 0; // How many hits player2's fleet has taken
        game.is_initialized = false; // Game ready when both players joined
        game.is_game_over = false;
        game.winner = 0; // 0 = none, 1 = player1, 2 = player2
        game.pending_shot = None;
        game.pending_shot_by = Pubkey::default();
        game.player1_revealed = false;
        game.player2_revealed = false;
        game.bump = ctx.bumps.game;
        
        msg!("⚓ New Battleship game initialized by player: {}", game.player1);
        Ok(())
    }

    pub fn join_game(ctx: Context<JoinGame>, board_commitment: [u8; 32]) -> Result<()> {
        let game = &mut ctx.accounts.game;
        
        require!(!game.is_initialized, ErrorCode::GameAlreadyFull);
        require!(game.player1 != ctx.accounts.player.key(), ErrorCode::CannotPlayAgainstYourself);
        
        game.player2 = ctx.accounts.player.key();
        game.board_commit2 = board_commitment;
        game.is_initialized = true;
        
        msg!("🚢 Player {} joined the game! Game is now active.", game.player2);
        Ok(())
    }

    pub fn fire_shot(ctx: Context<FireShot>, x: u8, y: u8) -> Result<()> {
        let game = &mut ctx.accounts.game;
        
        require!(game.is_initialized, ErrorCode::GameNotReady);
        require!(!game.is_game_over, ErrorCode::GameOver);
        require!(x < 10 && y < 10, ErrorCode::InvalidCoordinate);
        require!(game.pending_shot.is_none(), ErrorCode::ShotPending);
        
        let current_player = ctx.accounts.player.key();
        let is_player1 = current_player == game.player1;
        let is_player2 = current_player == game.player2;
        
        require!(is_player1 || is_player2, ErrorCode::NotAPlayer);
        
        // Check if it's the player's turn
        require!(
            (game.turn == 1 && is_player1) || (game.turn == 2 && is_player2),
            ErrorCode::NotYourTurn
        );
        
        let coordinate_index = (x + 10 * y) as usize;
        
        // Check the opponent's board to ensure this coordinate hasn't been shot before
        let opponent_board = if is_player1 {
            &game.board_hits2
        } else {
            &game.board_hits1
        };
        
        require!(opponent_board[coordinate_index] == 0, ErrorCode::AlreadyShotHere);
        
        // Set pending shot
        game.pending_shot = Some((x, y));
        game.pending_shot_by = current_player;
        
        msg!("💥 Player {} fired at coordinate ({}, {})", current_player, x, y);
        Ok(())
    }

    pub fn reveal_shot_result(ctx: Context<RevealShotResult>, was_hit: bool) -> Result<()> {
        let game = &mut ctx.accounts.game;
        
        require!(game.is_initialized, ErrorCode::GameNotReady);
        require!(!game.is_game_over, ErrorCode::GameOver);
        require!(game.pending_shot.is_some(), ErrorCode::NoPendingShot);
        
        let current_player = ctx.accounts.player.key();
        let is_player1 = current_player == game.player1;
        let is_player2 = current_player == game.player2;
        
        require!(is_player1 || is_player2, ErrorCode::NotAPlayer);
        
        // Ensure this is the defending player (opposite of who fired)
        let is_defender = if game.pending_shot_by == game.player1 {
            is_player2
        } else {
            is_player1
        };
        
        require!(is_defender, ErrorCode::NotDefender);
        
        let (x, y) = game.pending_shot.unwrap();
        let coordinate_index = (x + 10 * y) as usize;
        
        // Update the defender's board
        let (defender_board, defender_hits_count, attacker_player_num) = if is_player1 {
            (&mut game.board_hits1, &mut game.hits_count1, 2)
        } else {
            (&mut game.board_hits2, &mut game.hits_count2, 1)
        };
        
        if was_hit {
            defender_board[coordinate_index] = 2; // 2 = hit
            *defender_hits_count += 1;
            msg!("🎯 HIT! Player {} hit a ship!", game.pending_shot_by);
            
            // Check for win condition (17 is standard Battleship total ship squares)
            if *defender_hits_count >= 17 {
                game.is_game_over = true;
                game.winner = attacker_player_num;
                msg!("🏆 Player {} wins! All ships sunk!", game.pending_shot_by);
            }
        } else {
            defender_board[coordinate_index] = 1; // 1 = miss
            msg!("💦 MISS! Player {} missed.", game.pending_shot_by);
        }
        
        // Clear pending shot and switch turns
        game.pending_shot = None;
        game.pending_shot_by = Pubkey::default();
        
        if !game.is_game_over {
            game.turn = if game.turn == 1 { 2 } else { 1 };
        }
        
        Ok(())
    }

    pub fn reveal_board_player1(
        ctx: Context<RevealBoard>, 
        original_board: [u8; 100], 
        salt: [u8; 32]
    ) -> Result<()> {
        let game = &mut ctx.accounts.game;
        
        require!(game.is_game_over, ErrorCode::GameNotOver);
        require!(ctx.accounts.player.key() == game.player1, ErrorCode::NotPlayer1);
        require!(!game.player1_revealed, ErrorCode::AlreadyRevealed);
        
        // Verify commitment
        let mut data_to_hash = Vec::new();
        data_to_hash.extend_from_slice(&original_board);
        data_to_hash.extend_from_slice(&salt);
        let computed_hash = hash(&data_to_hash).to_bytes();
        
        require!(computed_hash == game.board_commit1, ErrorCode::CommitmentMismatch);
        
        // Verify fleet configuration (17 total ship squares)
        let ship_count = original_board.iter().filter(|&&cell| cell == 1).count();
        require!(ship_count == 17, ErrorCode::InvalidFleetConfiguration);
        
        game.player1_revealed = true;
        
        // If both players revealed, verify shot consistency
        if game.player2_revealed {
            verify_shot_consistency(game, &original_board, true)?;
        }
        
        msg!("📋 Player1 board revealed and verified!");
        Ok(())
    }

    pub fn reveal_board_player2(
        ctx: Context<RevealBoard>, 
        original_board: [u8; 100], 
        salt: [u8; 32]
    ) -> Result<()> {
        let game = &mut ctx.accounts.game;
        
        require!(game.is_game_over, ErrorCode::GameNotOver);
        require!(ctx.accounts.player.key() == game.player2, ErrorCode::NotPlayer2);
        require!(!game.player2_revealed, ErrorCode::AlreadyRevealed);
        
        // Verify commitment
        let mut data_to_hash = Vec::new();
        data_to_hash.extend_from_slice(&original_board);
        data_to_hash.extend_from_slice(&salt);
        let computed_hash = hash(&data_to_hash).to_bytes();
        
        require!(computed_hash == game.board_commit2, ErrorCode::CommitmentMismatch);
        
        // Verify fleet configuration (17 total ship squares)
        let ship_count = original_board.iter().filter(|&&cell| cell == 1).count();
        require!(ship_count == 17, ErrorCode::InvalidFleetConfiguration);
        
        game.player2_revealed = true;
        
        // If both players revealed, verify shot consistency
        if game.player1_revealed {
            verify_shot_consistency(game, &original_board, false)?;
        }
        
        msg!("📋 Player2 board revealed and verified!");
        Ok(())
    }
}

// Helper function to verify shot consistency after both boards are revealed
fn verify_shot_consistency(
    game: &Game, 
    revealed_board: &[u8; 100], 
    is_player1_board: bool
) -> Result<()> {
    let hits_board = if is_player1_board {
        &game.board_hits1
    } else {
        &game.board_hits2
    };
    
    for i in 0..100 {
        match hits_board[i] {
            1 => {
                // Marked as miss - should be empty on revealed board
                require!(revealed_board[i] == 0, ErrorCode::CheatingDetected);
            },
            2 => {
                // Marked as hit - should have ship on revealed board
                require!(revealed_board[i] == 1, ErrorCode::CheatingDetected);
            },
            _ => {} // 0 = not shot, no verification needed
        }
    }
    
    Ok(())
}

#[derive(Accounts)]
pub struct InitializeGame<'info> {
    #[account(
        init,
        payer = player,
        space = Game::LEN,
        seeds = [b"game", player.key().as_ref()],
        bump
    )]
    pub game: Account<'info, Game>,
    
    #[account(mut)]
    pub player: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct JoinGame<'info> {
    #[account(mut)]
    pub game: Account<'info, Game>,
    
    pub player: Signer<'info>,
}

#[derive(Accounts)]
pub struct FireShot<'info> {
    #[account(mut)]
    pub game: Account<'info, Game>,
    
    pub player: Signer<'info>,
}

#[derive(Accounts)]
pub struct RevealShotResult<'info> {
    #[account(mut)]
    pub game: Account<'info, Game>,
    
    pub player: Signer<'info>,
}

#[derive(Accounts)]
pub struct RevealBoard<'info> {
    #[account(mut)]
    pub game: Account<'info, Game>,
    
    pub player: Signer<'info>,
}

#[account]
pub struct Game {
    pub player1: Pubkey,               // 32 bytes
    pub player2: Pubkey,               // 32 bytes
    pub board_commit1: [u8; 32],       // 32 bytes - Player1's board commitment hash
    pub board_commit2: [u8; 32],       // 32 bytes - Player2's board commitment hash
    pub turn: u8,                      // 1 byte - 1 for player1, 2 for player2
    pub board_hits1: [u8; 100],        // 100 bytes - Hits on player1's board (0=empty, 1=miss, 2=hit)
    pub board_hits2: [u8; 100],        // 100 bytes - Hits on player2's board (0=empty, 1=miss, 2=hit)
    pub hits_count1: u8,               // 1 byte - Number of hits player1 has taken
    pub hits_count2: u8,               // 1 byte - Number of hits player2 has taken
    pub is_initialized: bool,          // 1 byte - Both players joined
    pub is_game_over: bool,            // 1 byte - Game finished
    pub winner: u8,                    // 1 byte - 0=none, 1=player1, 2=player2
    pub pending_shot: Option<(u8, u8)>, // 3 bytes - Current pending shot coordinates
    pub pending_shot_by: Pubkey,       // 32 bytes - Who fired the pending shot
    pub player1_revealed: bool,        // 1 byte - Player1 has revealed their board
    pub player2_revealed: bool,        // 1 byte - Player2 has revealed their board
    pub bump: u8,                      // 1 byte - PDA bump
}

impl Game {
    pub const LEN: usize = 8 + 32 + 32 + 32 + 32 + 1 + 100 + 100 + 1 + 1 + 1 + 3 + 32 + 1 + 1 + 1; // ~380 bytes + discriminator
}

#[error_code]
pub enum ErrorCode {
    #[msg("Game is already full")]
    GameAlreadyFull,
    #[msg("Game is not ready - waiting for second player")]
    GameNotReady,
    #[msg("Game is over")]
    GameOver,
    #[msg("Game is not over yet - cannot reveal")]
    GameNotOver,
    #[msg("Invalid coordinate - must be 0-9")]
    InvalidCoordinate,
    #[msg("Already shot at this coordinate")]
    AlreadyShotHere,
    #[msg("Not your turn")]
    NotYourTurn,
    #[msg("You are not a player in this game")]
    NotAPlayer,
    #[msg("Cannot play against yourself")]
    CannotPlayAgainstYourself,
    #[msg("Not the defender for this shot")]
    NotDefender,
    #[msg("No pending shot to resolve")]
    NoPendingShot,
    #[msg("Shot is already pending resolution")]
    ShotPending,
    #[msg("Commitment hash does not match revealed data")]
    CommitmentMismatch,
    #[msg("Invalid fleet configuration - must have exactly 17 ship squares")]
    InvalidFleetConfiguration,
    #[msg("Not player1")]
    NotPlayer1,
    #[msg("Not player2")]
    NotPlayer2,
    #[msg("Board already revealed")]
    AlreadyRevealed,
    #[msg("Cheating detected - shot results don't match revealed board")]
    CheatingDetected,
} 
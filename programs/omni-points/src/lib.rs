use anchor_lang::prelude::*;

declare_id!("4MdBaUYXkq988MUB8ZSd75botW7sPyLB3w9etU7wDPzJ");

#[program]
pub mod omni_points {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}

import { IAuthRepository } from '../repositories/auth-repository.interface';

export class LogoutUseCase {
  constructor(private readonly authRepository: IAuthRepository) {}

  async execute(): Promise<void> {
    try {
      await this.authRepository.logout();
    } catch (error) {
      // Even if network fails, always clear local session
      console.warn('[LogoutUseCase] Remote logout encountered error, clearing local session', error);
    } finally {
      await this.authRepository.clearSession();
    }
  }
}


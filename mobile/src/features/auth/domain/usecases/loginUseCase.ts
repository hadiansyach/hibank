import { AuthRepository, LoginParams } from '../repositories/authRepository';
import { AuthSession } from '../entities/user';

export class LoginUseCase {
  constructor(private readonly authRepository: AuthRepository) {}

  async execute(params: LoginParams): Promise<AuthSession> {
    return this.authRepository.login(params);
  }
}

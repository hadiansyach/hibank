import { AuthRepository, RegisterParams } from '../repositories/authRepository';
import { User } from '../entities/user';

export class RegisterUseCase {
  constructor(private readonly authRepository: AuthRepository) {}

  async execute(params: RegisterParams): Promise<User> {
    return this.authRepository.register(params);
  }
}

import { IAuthRepository, LoginParams } from '../repositories/auth-repository.interface';
import { AuthSession } from '../entities/user';
import { AppError } from '@/core/errors/app-error';
import { loginSchema } from '@/core/validation/auth.schema';

export class LoginUseCase {
  constructor(private readonly authRepository: IAuthRepository) {}

  async execute(params: LoginParams): Promise<AuthSession> {
    const validationResult = loginSchema.safeParse({
      email: params.email,
      password: params.password,
    });

    if (!validationResult.success) {
      const details = validationResult.error.errors.map((e) => e.message);
      throw new AppError('Kredensial login tidak lengkap', {
        code: 'VALIDATION_FAILED',
        details,
      });
    }

    const session = await this.authRepository.login(params);
    await this.authRepository.saveSession(session);
    return session;
  }
}


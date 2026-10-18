import { IAuthRepository, RegisterParams } from '../repositories/auth-repository.interface';
import { User } from '../entities/user';
import { AppError } from '@/core/errors/app-error';
import { registerSchema } from '@/core/validation/auth.schema';

export class RegisterUseCase {
  constructor(private readonly authRepository: IAuthRepository) {}

  async execute(params: RegisterParams): Promise<User> {
    const validationResult = registerSchema.safeParse(params);
    if (!validationResult.success) {
      const details = validationResult.error.errors.map((e) => e.message);
      throw new AppError('Validasi data pendaftaran belum sesuai', {
        code: 'VALIDATION_FAILED',
        details,
      });
    }

    return await this.authRepository.register(params);
  }
}


import { ITransferRepository } from '../repositories/transfer-repository.interface';
import { TransferRequest, TransferResult } from '../entities/transfer';
import { AppError } from '@/core/errors/app-error';

export class ExecuteTransferUseCase {
  constructor(private readonly transferRepository: ITransferRepository) {}

  async execute(request: TransferRequest): Promise<TransferResult> {
    if (!request.sourceAccountId) {
      throw new AppError('Rekening sumber wajib dipilih', { code: 'INVALID_SOURCE_ACCOUNT' });
    }
    if (!request.targetAccountNumber || request.targetAccountNumber.length < 5) {
      throw new AppError('Nomor rekening tujuan tidak valid', { code: 'INVALID_TARGET_ACCOUNT' });
    }
    if (!request.amount || request.amount < 10000) {
      throw new AppError('Nominal transfer minimal Rp 10.000', { code: 'MINIMUM_TRANSFER_LIMIT' });
    }
    if (!request.pin || request.pin.length !== 6) {
      throw new AppError('PIN transaksi harus 6 digit angka', { code: 'INVALID_PIN' });
    }

    if (request.targetBankCode && request.targetBankCode !== 'HIBANK') {
      return await this.transferRepository.transferInterbank(request);
    }
    return await this.transferRepository.transferInternal(request);
  }
}


import { ITransferRepository } from '../repositories/transfer-repository.interface';
import { TransferResult } from '../entities/transfer';

export class GetTransferReceiptUseCase {
  constructor(private readonly transferRepository: ITransferRepository) {}

  async execute(transactionId: string): Promise<TransferResult> {
    return await this.transferRepository.getTransferById(transactionId);
  }
}

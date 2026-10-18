import { InquiryResult } from '../entities/transfer';
import { ITransferRepository } from '../repositories/transfer-repository.interface';

export class InquiryUseCase {
  constructor(private readonly transferRepository: ITransferRepository) {}

  async execute(sourceAccountId: string, targetAccountNumber: string): Promise<InquiryResult> {
    return await this.transferRepository.inquiry(sourceAccountId, targetAccountNumber);
  }
}


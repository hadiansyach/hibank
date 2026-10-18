import { InquiryResult, TransferRequest, TransferResult } from '../entities/transfer';

export interface ITransferRepository {
  inquiry(sourceAccountId: string, targetAccountNumber: string): Promise<InquiryResult>;
  transferInternal(request: TransferRequest): Promise<TransferResult>;
  transferInterbank(request: TransferRequest): Promise<TransferResult>;
  getTransferById(transactionId: string): Promise<TransferResult>;
}


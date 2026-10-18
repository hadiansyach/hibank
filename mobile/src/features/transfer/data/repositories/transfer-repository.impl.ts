import { ITransferRepository } from '../../domain/repositories/transfer-repository.interface';
import { InquiryResult, TransferRequest, TransferResult } from '../../domain/entities/transfer';
import { ITransferRemoteDataSource } from '../datasources/transfer-remote-datasource';

export class TransferRepositoryImpl implements ITransferRepository {
  constructor(private readonly remoteDataSource: ITransferRemoteDataSource) {}

  async inquiry(sourceAccountId: string, targetAccountNumber: string): Promise<InquiryResult> {
    const res = await this.remoteDataSource.inquiry({
      source_account_id: sourceAccountId,
      target_account_number: targetAccountNumber,
    });
    return {
      sourceAccountId: res.source_account_id,
      targetAccountNumber: res.target_account_number,
      recipientName: res.recipient_name,
      bankCode: res.bank_code,
      bankName: res.bank_name,
      fee: res.fee,
    };
  }

  async transferInternal(request: TransferRequest): Promise<TransferResult> {
    const response = await this.remoteDataSource.transferInternal({
      source_account_id: request.sourceAccountId,
      target_account_number: request.targetAccountNumber,
      amount: request.amount,
      notes: request.notes,
      pin: request.pin,
    }, request.idempotencyKey);

    return {
      transactionId: response.transaction_id,
      status: response.status,
      sourceAccountNumber: response.source_account_number,
      targetAccountNumber: response.target_account_number,
      recipientName: response.recipient_name,
      amount: response.amount,
      fee: response.fee,
      timestamp: response.created_at || response.timestamp || new Date().toISOString(),
      referenceNumber: response.reference_number,
      notes: response.notes,
    };
  }

  async transferInterbank(request: TransferRequest): Promise<TransferResult> {
    const response = await this.remoteDataSource.transferInterbank({
      source_account_id: request.sourceAccountId,
      target_bank_code: request.targetBankCode || 'BANK_B',
      target_account_number: request.targetAccountNumber,
      amount: request.amount,
      notes: request.notes,
      pin: request.pin,
    }, request.idempotencyKey);

    return {
      transactionId: response.transaction_id,
      status: response.status,
      sourceAccountNumber: response.source_account_number,
      targetAccountNumber: response.target_account_number,
      recipientName: response.recipient_name,
      amount: response.amount,
      fee: response.fee,
      timestamp: response.created_at || response.timestamp || new Date().toISOString(),
      referenceNumber: response.reference_number,
      notes: response.notes,
    };
  }

  async getTransferById(transactionId: string): Promise<TransferResult> {
    const response = await this.remoteDataSource.getTransferById(transactionId);
    return {
      transactionId: response.transaction_id,
      status: response.status,
      sourceAccountNumber: response.source_account_number,
      targetAccountNumber: response.target_account_number,
      recipientName: response.recipient_name,
      amount: response.amount,
      fee: response.fee,
      timestamp: response.created_at || response.timestamp || new Date().toISOString(),
      referenceNumber: response.reference_number,
      notes: response.notes,
    };
  }
}


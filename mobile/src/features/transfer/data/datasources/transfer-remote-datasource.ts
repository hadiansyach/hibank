import { apiClient } from '@/core/network/api-client';
import * as Crypto from 'expo-crypto';
import {
  InquiryRequestDto,
  InquiryResponseDto,
  InternalTransferRequestDto,
  InterbankTransferRequestDto,
  TransferResponseDto,
} from '../models/transfer.dto';

export interface ITransferRemoteDataSource {
  inquiry(dto: InquiryRequestDto): Promise<InquiryResponseDto>;
  transferInternal(dto: InternalTransferRequestDto, idempotencyKey?: string): Promise<TransferResponseDto>;
  transferInterbank(dto: InterbankTransferRequestDto, idempotencyKey?: string): Promise<TransferResponseDto>;
  getTransferById(transactionId: string): Promise<TransferResponseDto>;
}

export class TransferRemoteDataSourceImpl implements ITransferRemoteDataSource {
  async inquiry(dto: InquiryRequestDto): Promise<InquiryResponseDto> {
    const response = await apiClient.post<InquiryResponseDto>('/v1/transfers/inquiry', dto);
    return response.data;
  }

  async transferInternal(dto: InternalTransferRequestDto, idempotencyKey?: string): Promise<TransferResponseDto> {
    const key = idempotencyKey || Crypto.randomUUID();
    const response = await apiClient.post<TransferResponseDto>('/v1/transfers', dto, {
      headers: {
        'Idempotency-Key': key,
      },
    });
    return response.data;
  }

  async transferInterbank(dto: InterbankTransferRequestDto, idempotencyKey?: string): Promise<TransferResponseDto> {
    const key = idempotencyKey || Crypto.randomUUID();
    const response = await apiClient.post<TransferResponseDto>('/v1/transfers', dto, {
      headers: {
        'Idempotency-Key': key,
      },
    });
    return response.data;
  }

  async getTransferById(transactionId: string): Promise<TransferResponseDto> {
    const response = await apiClient.get<TransferResponseDto>(`/v1/transfers/${transactionId}`);
    return response.data;
  }
}


import { TransferRemoteDataSourceImpl } from "../data/datasources/transfer-remote-datasource";
import { TransferRepositoryImpl } from "../data/repositories/transfer-repository.impl";
import { ExecuteTransferUseCase } from "../domain/usecases/execute-transfer.usecase";
import { InquiryUseCase } from "../domain/usecases/inquiry.usecase";
import { GetTransferReceiptUseCase } from "../domain/usecases/get-transfer-receipt.usecase";

const transferRemoteDataSource = new TransferRemoteDataSourceImpl();
export const transferRepository = new TransferRepositoryImpl(
  transferRemoteDataSource,
);
export const executeTransferUseCase = new ExecuteTransferUseCase(
  transferRepository,
);
export const inquiryUseCase = new InquiryUseCase(transferRepository);
export const getTransferReceiptUseCase = new GetTransferReceiptUseCase(
  transferRepository,
);

import { HistoryRemoteDataSourceImpl } from '../data/datasources/history-remote-datasource';
import { HistoryRepositoryImpl } from '../data/repositories/history-repository.impl';
import { GetHistoryUseCase } from '../domain/usecases/get-history.usecase';

const historyRemoteDataSource = new HistoryRemoteDataSourceImpl();
export const historyRepository = new HistoryRepositoryImpl(historyRemoteDataSource);
export const getHistoryUseCase = new GetHistoryUseCase(historyRepository);


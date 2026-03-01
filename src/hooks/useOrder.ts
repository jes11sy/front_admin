/**
 * Custom hook для работы с заказами (Admin)
 * Инкапсулирует логику загрузки и обновления заказа
 */

import { useState, useCallback } from 'react';
import { apiClient } from '@/lib/api';
import { useAsync, useMutation } from './useAsync';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

// Типы для заказа
export interface Order {
  id: number;
  rkId: number;
  rk?: { id: number; name: string };
  cityId: number;
  city?: { id: number; name: string };
  phone: string;
  typeOrder: string;
  clientName: string;
  address: string;
  dateMeeting: string;
  closingAt: string | null;
  createdAt: string;
  equipmentTypeId: number;
  equipmentType?: { id: number; name: string };
  statusId: number;
  status?: { id: number; name: string; code: string };
  masterId: number | null;
  result: number | null;
  expenditure: number | null;
  clean: number | null;
  masterChange: number | null;
  prepayment: number | null;
  dateCloseMod: string | null;
  operatorId: number;
  master?: { id: number; name: string };
  operator?: { id: number; name: string; login: string };
  comment?: string;
  bsoDoc?: string[] | null;
  expenditureDoc?: string[] | null;
  partner?: boolean;
  partnerPercent?: number | null;
  callId?: string | null;
}

export interface Master {
  id: number;
  name: string;
  status?: string;
  cityIds?: number[];
}

export interface Call {
  id: number;
  recordingPath?: string;
  createdAt?: string;
  recordingProcessedAt?: string;
}

export function useOrder(orderId: string) {
  // Загрузка заказа
  const {
    data: orderResponse,
    loading: orderLoading,
    error: orderError,
    refetch: refetchOrder,
  } = useAsync<any>(
    () => apiClient.getOrder(orderId),
    [orderId],
    {
      onError: (error) => {
        toast.error(`Ошибка загрузки заказа: ${error.message}`);
      },
    }
  );

  // Загрузка мастеров
  const {
    data: mastersResponse,
    loading: mastersLoading,
  } = useAsync<any>(
    () => apiClient.getMasters(),
    [],
    {
      onError: (error) => {
        logger.error('Failed to load masters', error);
      },
    }
  );

  // Извлекаем данные из ответов API
  const order = orderResponse?.data || orderResponse;
  const mastersData = mastersResponse?.data || mastersResponse || [];

  // Фильтруем мастеров только с активным статусом
  const masters = (Array.isArray(mastersData) ? mastersData : []).filter((master: Master) => {
    const status = (master.status || '').toLowerCase();
    return status === 'active' || status.includes('работает') || status.includes('работающий');
  });

  // Обновление заказа
  const {
    mutate: updateOrder,
    loading: updating,
  } = useMutation(
    (data: Partial<Order>) => apiClient.updateOrder(orderId, data),
    {
      onSuccess: () => {
        toast.success('Заказ успешно обновлен');
        refetchOrder();
      },
      onError: (error) => {
        toast.error(`Ошибка обновления заказа: ${error.message}`);
      },
    }
  );

  const loading = orderLoading || mastersLoading;
  const error = orderError;

  return {
    order,
    masters,
    loading,
    error,
    updating,
    updateOrder,
    refetchOrder,
  };
}

/**
 * Hook для работы со звонками заказа
 */
export function useOrderCalls(orderId: string) {
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const loadCalls = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Пока API для звонков не реализован в админке
      setCalls([]);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load calls');
      setError(error);
      logger.error('Failed to load calls', err);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  return {
    calls,
    loading,
    error,
    loadCalls,
  };
}

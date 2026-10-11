import { Alert } from 'react-native';
import { useStore } from '@/store/useStore';

// Single entry point for deleting a transaction from any list or form. Plain transactions
// delete immediately (as before); Cashbook-linked ones explain what else changes.
export function requestDeleteTransaction(id: string, onDeleted?: () => void) {
  const { transactions, cashbookEntries, deleteTransaction } = useStore.getState();
  const tx = transactions.find((t) => t.id === id);
  if (!tx) return;
  const ref = tx.cashbookRef;
  const entry = ref ? cashbookEntries.find((e) => e.id === ref.entryId) : undefined;

  if (!ref || !entry) {
    if (deleteTransaction(id)) onDeleted?.();
    return;
  }
  if (!ref.installmentId) {
    Alert.alert(
      'Linked to Cashbook',
      `This transaction records the ${entry.type === 'LOAN' ? 'loan from' : 'money lent to'} ${entry.contactName}. ` +
        'To remove it, delete the Cashbook entry instead.'
    );
    return;
  }
  Alert.alert(
    'Delete Repayment',
    `This is a Cashbook repayment ${entry.type === 'LOAN' ? 'to' : 'from'} ${entry.contactName}. ` +
      'Deleting it also removes the payment from the Cashbook entry.',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          if (useStore.getState().deleteTransaction(id)) onDeleted?.();
        },
      },
    ]
  );
}

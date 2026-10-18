import { create } from 'zustand';

interface AccountState {
  selectedAccountId: string | null;
  isAccountSwitcherOpen: boolean;
  isOpenAccountModalOpen: boolean;

  setSelectedAccountId: (id: string | null) => void;
  setAccountSwitcherOpen: (open: boolean) => void;
  setOpenAccountModalOpen: (open: boolean) => void;
}

export const useAccountStore = create<AccountState>((set) => ({
  selectedAccountId: null,
  isAccountSwitcherOpen: false,
  isOpenAccountModalOpen: false,

  setSelectedAccountId: (id) => set({ selectedAccountId: id }),
  setAccountSwitcherOpen: (open) => set({ isAccountSwitcherOpen: open }),
  setOpenAccountModalOpen: (open) => set({ isOpenAccountModalOpen: open }),
}));

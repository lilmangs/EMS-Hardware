import { useCallback, useEffect, useState } from 'react';

export type BranchFilterValue = 'all' | 'lagonglong' | 'balingasag';

const STORAGE_KEY = 'global_branch_filter';
const CHANGE_EVENT = 'global_branch_filter_changed';

function isValidBranchFilterValue(v: unknown): v is BranchFilterValue {
    return v === 'all' || v === 'lagonglong' || v === 'balingasag';
}

export function useBranchFilter() {
    const [branch, setBranchState] = useState<BranchFilterValue>('all');

    useEffect(() => {
        try {
            const raw = window.localStorage.getItem(STORAGE_KEY);
            if (isValidBranchFilterValue(raw)) {
                setBranchState(raw);
            }
        } catch {
            // ignore
        }
    }, []);

    useEffect(() => {
        const onStorage = (e: StorageEvent) => {
            if (e.key !== STORAGE_KEY) return;
            if (isValidBranchFilterValue(e.newValue)) {
                setBranchState(e.newValue);
            }
        };

        const onChangeEvent = (e: Event) => {
            const ce = e as CustomEvent<BranchFilterValue>;
            if (isValidBranchFilterValue(ce.detail)) {
                setBranchState(ce.detail);
            }
        };

        window.addEventListener('storage', onStorage);
        window.addEventListener(CHANGE_EVENT, onChangeEvent as EventListener);

        return () => {
            window.removeEventListener('storage', onStorage);
            window.removeEventListener(CHANGE_EVENT, onChangeEvent as EventListener);
        };
    }, []);

    const setBranch = useCallback((next: BranchFilterValue) => {
        setBranchState(next);
        try {
            window.localStorage.setItem(STORAGE_KEY, next);
            window.dispatchEvent(new CustomEvent<BranchFilterValue>(CHANGE_EVENT, { detail: next }));
        } catch {
            // ignore
        }
    }, []);

    return { branch, setBranch };
}

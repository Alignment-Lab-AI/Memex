import type { RootState } from '../../types'

export const deriveStatusIconColor = ({
    currentUser,
    syncMenu: { pendingLocalChangeCount, pendingRemoteChangeCount },
}: RootState): 'green' | 'red' | 'yellow' => {
    if (pendingLocalChangeCount == null && pendingRemoteChangeCount == null) {
        return 'yellow'
    }

    if (currentUser == null) {
        return 'red'
    }

    if (pendingLocalChangeCount > 0 || pendingRemoteChangeCount > 0) {
        return 'yellow'
    }

    return 'green'
}

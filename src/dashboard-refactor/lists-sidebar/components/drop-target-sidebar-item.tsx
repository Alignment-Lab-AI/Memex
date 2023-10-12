import React from 'react'
import SidebarItem, { Props as SidebarItemProps } from './sidebar-item'
import Icon from '@worldbrain/memex-common/lib/common-ui/components/icon'

export interface Props
    extends Omit<SidebarItemProps, 'renderLeftSideIcon' | 'dropReceivingState'>,
        Required<Pick<SidebarItemProps, 'dropReceivingState'>> {}

const DropTargetSidebarItem: React.FunctionComponent<Props> = (props) => (
    <SidebarItem
        {...props}
        renderRightSideIcon={() => {
            if (props.dropReceivingState.wasPageDropped) {
                return (
                    <Icon
                        icon="check"
                        heightAndWidth="20px"
                        color="prime1"
                        hoverOff
                    />
                )
            }
            if (
                props.dropReceivingState.canReceiveDroppedItems &&
                props.dropReceivingState.isDraggedOver
            ) {
                return (
                    <Icon
                        icon="plus"
                        heightAndWidth="20px"
                        color="prime1"
                        hoverOff
                    />
                )
            }
            return props.renderRightSideIcon?.() ?? null
        }}
        renderEditIcon={() => {
            return props.renderEditIcon?.() ?? null
        }}
    />
)

export default DropTargetSidebarItem

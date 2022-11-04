import React, { ReactNode } from 'react'
import styled from 'styled-components'
import { DisplayEntry } from '../types'
import { StyledIconBase } from '@styled-icons/styled-icon'
import { fontSizeSmall } from 'src/common-ui/components/design-library/typography'

interface Props {
    entries: DisplayEntry[]
    renderEntryRow: (list: DisplayEntry, index: number) => ReactNode
    emptyView?: ReactNode
    id: string
    query?: string
}

export default class EntryResultsList extends React.Component<Props> {
    renderMain() {
        if (!this.props.entries || !this.props.entries.length) {
            return this.props.emptyView
        }

        return this.props.entries.map(this.props.renderEntryRow)
    }

    render = () => {
        return (
            <StyledContainer id={this.props.id}>
                {this.props.query === '' && (
                    <RecentItemsNotif>Recently used</RecentItemsNotif>
                )}
                {/*<FilterHelp>
                    Select lists to include
                    <Check size={18} /> or exclude
                    <MinusCircle size={18} />
                </FilterHelp>
                */}
                {this.renderMain()}
            </StyledContainer>
        )
    }
}

const RecentItemsNotif = styled.div`
    padding: 5px 10px;
    font-size: 12px;
    color: ${(props) => props.theme.colors.subText};
`

const StyledContainer = styled.div`
    display: flex;
    flex-direction: row;
    align-items: center;
    margin: 0 5px;
    border-radius: 6px;
    flex-direction: column;

    &::-webkit-scrollbar {
        display: none;
    }
`

const FilterHelp = styled.div`
    font-size: 14px;
    color: ${(props) => props.theme.colors.normalText};
    padding: 6px 2px;
    ${StyledIconBase} {
        stroke-width: 2px;
        margin: 0 3px;
    }
`

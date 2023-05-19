import React, { PureComponent, ReactElement } from 'react'
import styled from 'styled-components'

import Margin from 'src/dashboard-refactor/components/Margin'

import { fonts } from '../../styles'
import * as icons from 'src/common-ui/components/design-library/icons'
import Icon from '@worldbrain/memex-common/lib/common-ui/components/icon'
import { TooltipBox } from '@worldbrain/memex-common/lib/common-ui/components/tooltip-box'

export interface SearchBarProps {
    placeholder?: string
    searchQuery: string
    isSidebarLocked: boolean
    searchFiltersOpen: boolean
    onSearchQueryChange(queryString: string): void
    onSearchFiltersOpen(): void
    onInputClear(): void
    renderCopyPasterButton: () => ReactElement
    renderExpandButton: () => ReactElement
}

export default class SearchBar extends PureComponent<SearchBarProps> {
    private inputRef = React.createRef<HTMLInputElement>()

    componentDidMount() {
        this.inputRef.current.focus()
    }

    handleChange: React.KeyboardEventHandler = (evt) => {
        // need to amend getFilterStrings function to pull through search terms as well, then
        // bundle them in an object to send with the onSearchQueryChange func
        this.props.onSearchQueryChange((evt.target as HTMLInputElement).value)
    }

    handleClearSearch() {
        this.props.onInputClear()
        this.inputRef.current.focus()
    }

    render() {
        const {
            searchFiltersOpen,
            searchQuery,
            isSidebarLocked,
            onSearchFiltersOpen,
            renderCopyPasterButton,
            renderExpandButton,
        } = this.props
        return (
            <Margin vertical="auto">
                <SearchBarContainer isClosed={!isSidebarLocked}>
                    <FullWidthMargin>
                        {!!searchQuery ? (
                            <IconContainer>
                                <Margin right="5px">
                                    <Icon
                                        heightAndWidth="22px"
                                        filePath={icons.removeX}
                                        padding={'5px'}
                                        onClick={() => this.handleClearSearch()}
                                    />
                                </Margin>
                            </IconContainer>
                        ) : (
                            <IconContainer>
                                <Margin right="5px">
                                    <Icon
                                        heightAndWidth="22px"
                                        filePath={icons.searchIcon}
                                        padding={'5px'}
                                        hoverOff
                                    />
                                </Margin>
                            </IconContainer>
                        )}
                        <Input
                            ref={this.inputRef}
                            placeholder={
                                this.props.placeholder ??
                                'Search your saved pages and notes'
                            }
                            value={searchQuery}
                            onChange={this.handleChange}
                            autoComplete="off"
                        />
                    </FullWidthMargin>
                </SearchBarContainer>
                <ActionButtons>
                    <FilterButton left="15px" onClick={onSearchFiltersOpen}>
                        {searchFiltersOpen ? (
                            <TooltipBox
                                placement={'bottom'}
                                tooltipText={'Clear Filters'}
                            >
                                <Icon
                                    filePath={icons.removeX}
                                    heightAndWidth="22px"
                                    padding={'6px'}
                                />
                            </TooltipBox>
                        ) : (
                            <TooltipBox
                                placement={'bottom'}
                                tooltipText={'Apply Filters'}
                            >
                                <Icon
                                    filePath={icons.filterIcon}
                                    heightAndWidth="24px"
                                    padding={'5px'}
                                />
                            </TooltipBox>
                        )}
                    </FilterButton>
                    {renderCopyPasterButton()}
                    {renderExpandButton()}
                </ActionButtons>
                <Placeholder />
            </Margin>
        )
    }
}

const Placeholder = styled.div`
    width: 220px;

    @media screen and (max-width: 900px) {
        width: 120px;
    }
`

const textStyles = `
    font-family: ${fonts.primary.name};
    font-style: normal;
    font-weight: ${fonts.primary.weight.bold};
    color: ${(props) => props.theme.colors.white};
`

const SearchBarContainer = styled.div<{ isClosed: boolean }>`
    height: 44px;
    max-width: 450px;
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background-color: ${(props) => props.theme.colors.greyScale2};
    border-radius: 5px;
    padding: 0px 15px;
    flex: 1;

    @media screen and (max-width: 900px) {
        margin-left: ${(props) => props.isClosed && '50px'};
    }

    &:focus-within {
        outline: 1px solid ${(props) => props.theme.colors.greyScale4};
    }
`

const Input = styled.input`
    width: inherit;
    font-size: 14px;
    line-height: 18px;
    border: none;
    background-color: transparent;
    height: 44px;
    color: ${(props) => props.theme.colors.white};
    font-weight: 400;

    &::placeholder {
        color: ${(props) => props.theme.colors.greyScale5};
    }

    &:focus {
        outline: none;
    }

    &:focus ${SearchBarContainer} {
        outline: 1px solid ${(props) => props.theme.colors.greyScale3};
    }
`

const FilterButton = styled(Margin)`
    width: max-content;
    font-size: 12px;
    cursor: pointer;
    width: auto;
    white-space: nowrap;
`

const FullWidthMargin = styled(Margin)`
    width: 100%;
`

const SearchIcon = styled.img`
    width: 16px;
    height: 17px;
    display: flex;
    justify-content: center;
    align-items: center;
`

const IconContainer = styled.div`
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-items: start;
`

const StyledIcon = styled(Icon)`
    color: ${(props) => props.theme.colors.primary};
    opacity: 0.7;
    cursor: pointer;
`

const ActionButtons = styled.div`
    display: flex;
    align-items: center;
    justify-content: flex-start;
    grid-gap: 15px;
`

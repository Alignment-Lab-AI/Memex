import React, { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import Dropdown from './Dropdown'
import { UpdateNotifBanner } from 'src/common-ui/containers/UpdateNotifBanner'
import styled from 'styled-components'
import Icon from '@worldbrain/memex-common/lib/common-ui/components/icon'
import { TooltipBox } from '@worldbrain/memex-common/lib/common-ui/components/tooltip-box'
import { MemexThemeVariant } from '@worldbrain/memex-common/lib/common-ui/styles/types'
import { loadThemeVariant } from 'src/common-ui/components/design-library/theme'
import TextField from '@worldbrain/memex-common/lib/common-ui/components/text-field'

interface ResultsProps {
    position: string
    searchEngine: string
    totalCount: number
    seeMoreResults: Function
    toggleHideResults: Function
    hideResults: boolean
    toggleDropdown: Function
    closeDropdown: Function
    dropdown: boolean
    removeResults: Function
    changePosition: Function
    renderResultItems: Function
    renderNotification: React.ReactNode
    getRootElement: () => HTMLElement
    isSticky: boolean
    toggleStickyContainer: (isSticky: boolean) => Promise<void>
    updateQuery: (query: string) => Promise<void>
    query: string
}

interface ResultsState {
    themeVariant?: MemexThemeVariant
}

class Results extends React.Component<ResultsProps, ResultsState> {
    state: ResultsState = {}

    async componentDidMount() {
        let loaded: MemexThemeVariant = 'dark'
        try {
            loaded = await loadThemeVariant()
        } catch (err) {
            console.error('Could not load theme, falling back to dark mode')
        }
        this.setState({ themeVariant: loaded })
    }

    render() {
        if (!this.state.themeVariant) {
            return null
        }
        const { props } = this

        return (
            <>
                <MemexContainer
                    position={props.position}
                    hideResults={props.hideResults}
                    // searchEngine={props.searchEngine}
                >
                    <UpdateNotifBanner
                        theme={{
                            variant: this.state.themeVariant,
                            width:
                                props.position === 'side' && 'fill-available',
                            position: 'relative',
                            iconSize: '20px',
                        }}
                        location="search"
                    />
                    <TopBarArea hideResults={props.hideResults}>
                        <SearchContainer>
                            <SearchField
                                fontSize="16px"
                                onChange={(e) => {
                                    props.updateQuery(
                                        (e.target as HTMLInputElement).value,
                                    )
                                    props.toggleHideResults(false)
                                }}
                                placeholder={props.query}
                                icon="searchIcon"
                                padding={'0px 10px'}
                                actionButton={
                                    <ResultsBox>
                                        <TotalCount>
                                            {props.totalCount}
                                        </TotalCount>
                                    </ResultsBox>
                                }
                            />
                        </SearchContainer>

                        <IconArea>
                            <TooltipBox
                                placement={'bottom'}
                                tooltipText={'Go to Dashboard'}
                                getPortalRoot={this.props.getRootElement}
                            >
                                <Icon
                                    filePath={'searchIcon'}
                                    heightAndWidth="18px"
                                    padding="5px"
                                    onClick={props.seeMoreResults}
                                />
                            </TooltipBox>
                            <TooltipBox
                                placement={'bottom'}
                                tooltipText={'Pin Search Results'}
                                getPortalRoot={this.props.getRootElement}
                            >
                                <Icon
                                    filePath={'pin'}
                                    heightAndWidth="18px"
                                    padding="5px"
                                    color={
                                        this.props.isSticky
                                            ? 'prime1'
                                            : 'greyScale6'
                                    }
                                    onClick={() =>
                                        props.toggleStickyContainer(
                                            !this.props.isSticky,
                                        )
                                    }
                                />
                            </TooltipBox>
                            <TooltipBox
                                placement={'bottom'}
                                tooltipText={
                                    props.hideResults
                                        ? 'Show Results'
                                        : 'Hide Results'
                                }
                                getPortalRoot={this.props.getRootElement}
                            >
                                <Icon
                                    filePath={
                                        props.hideResults
                                            ? 'expand'
                                            : 'compress'
                                    }
                                    heightAndWidth="22px"
                                    onClick={() =>
                                        props.toggleHideResults(
                                            !props.hideResults,
                                        )
                                    }
                                />
                            </TooltipBox>
                            <SettingsButtonContainer>
                                <TooltipBox
                                    placement={'bottom'}
                                    tooltipText={'Settings'}
                                    getPortalRoot={this.props.getRootElement}
                                >
                                    <Icon
                                        filePath={'settings'}
                                        heightAndWidth="18px"
                                        padding="5px"
                                        onClick={props.toggleDropdown}
                                    />
                                </TooltipBox>
                                {props.dropdown && (
                                    <Dropdown
                                        remove={props.removeResults}
                                        rerender={props.changePosition}
                                        closeDropdown={props.closeDropdown}
                                    />
                                )}
                            </SettingsButtonContainer>
                        </IconArea>
                    </TopBarArea>
                    {!props.hideResults && (
                        <ResultsContainer>
                            {props.renderResultItems()}
                            <MemexLogo>
                                <Icon
                                    icon={'memexLogoGrey'}
                                    originalImage
                                    height="20px"
                                    width="130px"
                                    hoverOff
                                />
                            </MemexLogo>
                        </ResultsContainer>
                    )}
                </MemexContainer>
            </>
        )
    }
}

const MemexLogo = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    backdrop-filter: blur(10px);
    background: ${(props) => props.theme.colors.black}95;
    border-radius: 8px 0 0 0;
    position: sticky;
    bottom: 0px;
    right: 0px;
    padding: 3px 6px;
`

const SearchContainer = styled.div`
    display: flex;
    width: fill-available;
    flex: 1;
    min-width: 20%;
`

const SearchField = styled(TextField)``

const SettingsButtonContainer = styled.div``

const MemexContainer = styled.div`
    display: flex;
    flex-direction: column;
    height: ${(props) => (props.hideResults ? 'fit-content' : '650px')};
    width: ${(props) =>
        props.position === 'above' ? 'fill-available' : '450px'};
    box-shadow: 0px 0px 3px rgba(0, 0, 0, 0.1);
    position: relative;
    animation: fadeIn 1s ease-in;
    display: flex;
    flex-direction: column;
    margin-bottom: 20px;
    border-radius: 8px;
    margin-right: ${(props) => (props.position === 'above' ? '0px' : '30px')};
    background: ${(props) => props.theme.colors.black};
    font-family: ${(props) => props.theme.fonts.primary};
    border-radius: 12px;
    overflow: hidden;

    & * {
        font-family: ${(props) => props.theme.fonts.primary};
    }
`

const TopBarArea = styled.div<{ hideResults }>`
    border-bottom: ${(props) =>
        props.hideResults
            ? 'none'
            : '1px solid' + props.theme.colors.greyScale3};
    min-height: 50px;
    align-items: center;
    display: flex;
    justify-content: space-between;
    padding: 10px 20px;
    grid-gap: 15px;
`

const ResultsBox = styled.div`
    display: grid;
    grid-gap: 5px;
    align-items: center;
    grid-auto-flow: column;
    align-items: center;
    height: 24px;
    width: 24px;
`

const TotalCount = styled.div`
    color: ${(props) => props.theme.colors.prime1};
    font-weight: bold;
    font-size: 16px;
`

const ResultsText = styled.div`
    color: ${(props) => props.theme.colors.white};
    font-weight: 300;
    font-size: 16px;
`

const IconArea = styled.div`
    display: grid;
    grid-gap: 10px;
    align-items: center;
    grid-auto-flow: column;
`

const ResultsContainer = styled.div`
    display: flex;
    flex: 1;
    height: fill-available;
    flex-direction: column;
    overflow: scroll;
    height: 500px;
    position: relative;

    scrollbar-width: none;

    &::-webkit-scrollbar {
        display: none;
    }
`

const UpdateNotifBannerBox = styled.div`
    height: fit-content;
    border-radius: 8px 8px 0 0;
    position: absolute;
    top: 0px;
    width: fill-available;
    overflow: hidden;
    height: 120px;
`

export default Results

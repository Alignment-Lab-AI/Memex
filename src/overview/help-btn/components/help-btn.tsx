import React from 'react'
import browser from 'webextension-polyfill'
import styled, { keyframes, css } from 'styled-components'

import Icon from '@worldbrain/memex-common/lib/common-ui/components/icon'
import * as icons from 'src/common-ui/components/design-library/icons'
import { PopoutBox } from '@worldbrain/memex-common/lib/common-ui/components/popout-box'
import LoadingIndicator from '@worldbrain/memex-common/lib/common-ui/components/loading-indicator'
import { MemexThemeVariant } from '@worldbrain/memex-common/lib/common-ui/styles/types'

export interface Props {
    theme: MemexThemeVariant
    toggleTheme: () => void
}
export interface State {
    isOpen: boolean
    showChat: boolean
    showFeedbackForm: boolean
    showChangeLog: boolean
}

export class HelpBtn extends React.PureComponent<Props, State> {
    private helpButtonRef = React.createRef<HTMLDivElement>()

    state = {
        isOpen: false,
        showChat: false,
        showFeedbackForm: false,
        showChangeLog: false,
    }

    private handleClick: React.MouseEventHandler<HTMLButtonElement> = (e) => {
        e.preventDefault()

        this.setState((state) => ({ isOpen: !state.isOpen }))
    }

    private renderMenu() {
        if (!this.state.isOpen) {
            return null
        }

        return (
            <PopoutBox
                targetElementRef={this.helpButtonRef.current}
                placement={'top-end'}
                offsetX={10}
                closeComponent={() =>
                    this.setState((state) => ({
                        isOpen: !state.isOpen,
                        showChat: false,
                        showFeedbackForm: false,
                        showChangeLog: false,
                    }))
                }
            >
                {this.state.showChat ||
                this.state.showFeedbackForm ||
                this.state.showChangeLog ? (
                    <ChatBox>
                        <LoadingIndicator size={30} />
                        <ChatFrame
                            src={
                                this.state.showFeedbackForm
                                    ? 'https://memex.featurebase.app'
                                    : this.state.showChangeLog
                                    ? 'https://memex.featurebase.app/changelog'
                                    : 'https://go.crisp.chat/chat/embed/?website_id=05013744-c145-49c2-9c84-bfb682316599'
                            }
                            height={600}
                            width={500}
                        />
                    </ChatBox>
                ) : (
                    <MenuList>
                        <MenuItem
                            onClick={() =>
                                this.setState({
                                    showChat: true,
                                })
                            }
                            top={top}
                        >
                            <Icon
                                filePath={icons.chatWithUs}
                                heightAndWidth="22px"
                                hoverOff
                                color={'greyScale1'}
                            />
                            Live Chat Support
                        </MenuItem>
                        <MenuItem
                            onClick={() =>
                                window.open(
                                    'https://tutorials.memex.garden/tutorials',
                                )
                            }
                        >
                            <Icon
                                filePath={icons.helpIcon}
                                heightAndWidth="22px"
                                hoverOff
                            />
                            Tutorials and FAQs
                        </MenuItem>
                        <MenuItem
                            onClick={() =>
                                this.setState({ showFeedbackForm: true })
                            }
                        >
                            <Icon
                                filePath={icons.sadFace}
                                heightAndWidth="22px"
                                hoverOff
                            />
                            Feature Requests & Bugs
                        </MenuItem>
                        <MenuItem
                            onClick={() =>
                                window.open('https://community.memex.garden')
                            }
                        >
                            <Icon
                                filePath={icons.peopleFine}
                                heightAndWidth="22px"
                                hoverOff
                            />
                            Community Forum
                        </MenuItem>
                        <MenuItem
                            onClick={() =>
                                window.open('https://worldbrain.io/changelog')
                            }
                        >
                            <Icon
                                filePath={icons.command}
                                heightAndWidth="22px"
                                hoverOff
                            />
                            Keyboard Shortcuts
                        </MenuItem>
                        <MenuItem
                            onClick={() =>
                                this.setState({ showChangeLog: true })
                            }
                        >
                            <Icon
                                filePath={icons.clock}
                                heightAndWidth="22px"
                                hoverOff
                            />
                            What's new?
                        </MenuItem>
                        <MenuItem
                            onClick={() =>
                                window.open(
                                    'https://links.memex.garden/privacy',
                                )
                            }
                        >
                            <Icon
                                filePath={icons.shield}
                                heightAndWidth="22px"
                                hoverOff
                            />
                            Terms & Privacy
                        </MenuItem>
                        <MenuItem
                            onClick={() =>
                                window.open('https://twitter.com/memexgarden')
                            }
                        >
                            <Icon
                                filePath={icons.twitter}
                                heightAndWidth="22px"
                                hoverOff
                            />
                            Twitter - @memexgarden
                        </MenuItem>
                        <FooterText>
                            Memex {browser.runtime.getManifest().version}
                        </FooterText>
                    </MenuList>
                )}
            </PopoutBox>
        )
    }

    render() {
        return (
            <HelpIconPosition>
                {this.renderMenu()}
                {window.location.href.includes('/overview') && (
                    <Icon
                        heightAndWidth="24px"
                        color={
                            this.props.theme === 'dark'
                                ? 'greyScale5'
                                : 'greyScale4'
                        }
                        filePath={this.props.theme === 'dark' ? 'moon' : 'sun'}
                        onClick={() => this.props.toggleTheme()}
                    />
                )}
                <Icon
                    filePath={icons.helpIcon}
                    heightAndWidth={'24px'}
                    onClick={this.handleClick}
                    containerRef={this.helpButtonRef}
                />
            </HelpIconPosition>
        )
    }
}

const ChatBox = styled.div`
    position: relative;
    height: 600px;
    width: 500px;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
`
const ChatFrame = styled.iframe`
    border: none;
    border-radius: 12px;
    position: absolute;
    top: 0px;
    left: 0px;
`

const MenuList = styled.div`
    display: flex;
    flex-direction: column;
    width: 300px;
    padding: 10px;
    position: relative;
    height: 360px;
    grid-gap: 2px;
`

const HelpIconPosition = styled.div`
    display: flex;
    justify-content: space-between;
    height: fit-content;
    width: fit-content;
    position: fixed;
    bottom: 10px;
    right: 10px;
    z-index: 100;
    grid-gap: 10px;

    @media (max-width: 1100px) {
        display: none;
    }
`
const openAnimation = keyframes`
 0% { padding-bottom: 5px; opacity: 0 }
 100% { padding-bottom: 0px; opacity: 1 }
`

const MenuItem = styled.div<{ order: number }>`
    animation-name: ${openAnimation};
    animation-delay: 15ms;
    animation-duration: 0.1s;
    animation-timing-function: ease-in-out;
    animation-fill-mode: backwards;
    overflow: hidden;
    height: 43px;
    display: flex;
    align-items: center;
    padding-bottom: 0px;

    border-radius: 8px;
    border: none;
    list-style: none;
    background-color: ${(props) => props.top && props.theme.colors.prime1};
    color: ${(props) =>
        props.top ? props.theme.colors.black : props.theme.colors.greyScale6};
    justify-content: ${(props) => props.top && 'center'};
    font-weight: 400;
    height: 40px;
    padding: 0 10px;
    display: flex;
    align-items: center;
    text-decoration: none;
    font-size: 14px;
    grid-gap: 10px;

    cursor: pointer;

    & * {
        cursor: pointer;
    }

    &:hover {
        outline: 1px solid ${(props) => props.theme.colors.greyScale3};
    }
`

const Link = styled.a<{ top }>`
    color: ${(props) =>
        props.top ? props.theme.colors.black : props.theme.colors.white};
    font-weight: ${(props) => (props.top ? '600' : '400')};
    height: 40px;
    padding: 0 10px;
    display: flex;
    align-items: center;
    text-decoration: none;
    font-size: 14px;
    grid-gap: 10px;
`

const FooterText = styled.div`
    height: 20px;
    display: flex;
    font-size: 14px;
    align-items: center;
    font-weight: 300;
    color: ${(props) => props.theme.colors.greyScale5};
    padding: 0px 10px 0 10px;
`

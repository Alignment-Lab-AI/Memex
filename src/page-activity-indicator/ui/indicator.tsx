import React from 'react'
import styled, { css, keyframes } from 'styled-components'
import Icon from '@worldbrain/memex-common/lib/common-ui/components/icon'
import { logoNoText } from 'src/common-ui/components/design-library/icons'

export interface Props {
    onGoToClick: React.MouseEventHandler
    mouseLeaveHideTimeoutMs?: number
}

interface State {
    isShown: boolean
    isExpanded: boolean
}

export default class PageActivityIndicator extends React.PureComponent<
    Props,
    State
> {
    keepNotShown = false
    static defaultProps: Pick<Props, 'mouseLeaveHideTimeoutMs'> = {
        mouseLeaveHideTimeoutMs: 700,
    }

    state: State = { isShown: true, isExpanded: false }
    private timeoutId?: number

    private handleMouseEnter: React.MouseEventHandler = (e) => {
        clearTimeout(this.timeoutId)
        this.setState({ isExpanded: true })
    }

    private handleMouseLeave: React.MouseEventHandler = (e) => {
        clearTimeout(this.timeoutId)
        this.timeoutId = setTimeout(() => {
            this.setState({ isExpanded: false })
        }, this.props.mouseLeaveHideTimeoutMs)
    }

    render() {
        if (!this.state.isShown && this.keepNotShown) {
            return null
        }

        return (
            <Container
                onMouseEnter={this.handleMouseEnter}
                onMouseLeave={this.handleMouseLeave}
                onClick={this.props.onGoToClick}
                isExpanded={this.state.isExpanded}
            >
                <ExpandedContainer isExpanded={this.state.isExpanded}>
                    <Icon icon="goTo" heightAndWidth="20px" />
                    <TextBox>
                        <TextMain>Page is annotated</TextMain>
                        <TextSecondary>
                            in Memex Spaces you follow
                        </TextSecondary>
                    </TextBox>

                    <Icon
                        icon="removeX"
                        heightAndWidth="20px"
                        onClick={(event) => {
                            event.stopPropagation()
                            this.setState({ isShown: false })
                            this.keepNotShown = true
                        }}
                    />
                </ExpandedContainer>
                <MiniContainer isExpanded={this.state.isExpanded}>
                    <Icon
                        filePath={logoNoText}
                        heightAndWidth="30px"
                        color="primaryLight"
                    />
                </MiniContainer>
            </Container>
        )
    }
}

const openNotif = keyframes`
 0% { scale: 0.8 }
 50% { scale: 1.1 }
 100% { scale: 1}
`

const Container = styled.div<{ isExpanded }>`
    position: fixed;
    top: 20px;
    right: 20px;
    width: fit-content;
    max-width: 40px;
    width: 40px;
    height: 40px;
    z-index: 30000000000;
    border-radius: 6px;
    padding: 10px;
    border: 1px solid ${(props) => props.theme.colors.greyScale4};
    background-color: ${(props) => props.theme.colors.backgroundColor};
    box-shadow: 0px 4px 16px rgba(14, 15, 21, 0.3),
        0px 12px 24px rgba(14, 15, 21, 0.15);
    display: flex;
    align-items: center;
    justify-content: center;
    grid-gap: 20px;
    cursor: pointer;
    animation: ${openNotif} 0.3s ease-in-out;
    transition: max-width 0.2s cubic-bezier(0.4, 0, 0.16, 0.87);

    ${(props) =>
        props.isExpanded &&
        css`
            max-width: 300px;
            width: fit-content;
        `};
`

const MiniContainer = styled.div<{
    isExpanded
}>`
    position: absolute;
    right: 12px;
    width: 40x;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 1;
    ${(props) =>
        props.isExpanded &&
        css`
            opacity: 0;
        `};
`

const openAnimation = keyframes`
 0% { opacity: 0 }
 100% { opacity: 1 }
`

const ExpandedContainer = styled.div<{
    isExpanded
}>`
    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: center;
    grid-gap: 10px;
    width: fit-content;
    opacity: 0;

    ${(props) =>
        props.isExpanded &&
        css`
            animation: ${openAnimation} 0.3s ease-in-out;
            animation-fill-mode: forwards;
            opacity: 1;
        `};
`
const TextBox = styled.div`
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: flex-start;
`
const TextMain = styled.span`
    font-size: 14px;
    font-weight: bold;
    white-space: nowrap;
    color: ${(props) => props.theme.colors.normalText};
`
const TextSecondary = styled.span`
    font-size: 12px;
    color: ${(props) => props.theme.colors.greyScale8};
    white-space: nowrap;
`
const CancelBtn = styled.button``
const OpenBtn = styled.button``

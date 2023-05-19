import React, { PureComponent } from 'react'
import { connect, MapStateToProps } from 'react-redux'
import cx from 'classnames'

import Button from '../../components/Button'
import { RootState, ClickHandler } from '../../types'
import * as selectors from '../selectors'
import * as acts from '../actions'
import { getKeyboardShortcutsState } from 'src/in-page-ui/keyboard-shortcuts/content_script/detection'
import styled from 'styled-components'
import * as icons from 'src/common-ui/components/design-library/icons'
import Icon from '@worldbrain/memex-common/lib/common-ui/components/icon'
import KeyboardShortcuts from '@worldbrain/memex-common/lib/common-ui/components/keyboard-shortcuts'
import { pageActionAllowed } from 'src/util/subscriptions/storage'

const styles = require('./BookmarkButton.css')
const buttonStyles = require('../../components/Button.css')

export interface OwnProps {
    closePopup: () => void
}

interface StateProps {
    isDisabled: boolean
    isBookmarked: boolean
}

interface DispatchProps {
    toggleBookmark: ClickHandler<HTMLButtonElement>
}

export type Props = OwnProps & StateProps & DispatchProps

class BookmarkButton extends PureComponent<Props> {
    async componentDidMount() {
        await this.getKeyboardShortcutText()
    }

    state = {
        highlightInfo: undefined,
    }

    private async getKeyboardShortcutText() {
        const {
            shortcutsEnabled,
            createBookmark,
        } = await getKeyboardShortcutsState()

        if (!shortcutsEnabled || !createBookmark.enabled) {
            this.setState({
                highlightInfo: `${createBookmark.shortcut} (disabled)`,
            })
        } else
            this.setState({
                highlightInfo: `${createBookmark.shortcut}`,
            })
    }

    render() {
        const text = this.props.isBookmarked ? 'Page Saved!' : 'Quick Save Page'

        return (
            <ButtonItem
                onClick={!this.props.isDisabled && this.props.toggleBookmark}
                disabled={this.props.isDisabled || this.props.isBookmarked}
            >
                <Icon
                    filePath={
                        this.props.isBookmarked
                            ? icons.heartFull
                            : icons.heartEmpty
                    }
                    color={this.props.isBookmarked ? 'prime1' : 'greyScale6'}
                    heightAndWidth="22px"
                    hoverOff
                />
                <ButtonInnerContent>
                    {text}
                    <ShortCutContainer>
                        <KeyboardShortcuts
                            keys={this.state.highlightInfo?.split('+')}
                        />
                    </ShortCutContainer>
                </ButtonInnerContent>
            </ButtonItem>
        )
    }
}

const ShortCutContainer = styled.div`
    display: flex;
    align-items: center;
    color: ${(props) => props.theme.colors.greyScale6};
    grid-gap: 3px;
`

const ButtonItem = styled.div<{ disabled: boolean }>`
    display: flex;
    grid-gap: 15px;
    width: fill-available;
    align-items: center;
    justify-content: flex-start;
    padding: 0px 10px;
    margin: 10px 10px 0px 10px;
    height: 50px;
    border-radius: 8px;
    cursor: ${(props) => (props.disabled ? 'not-allowed' : 'pointer')};
    border: 1px solid transparent;

    &:hover {
        border: 1px solid ${(props) => props.theme.colors.greyScale3};
    }

    & * {
        cursor: ${(props) => (props.disabled ? 'not-allowed' : 'pointer')};
    }
`

const ButtonInnerContent = styled.div`
    display: flex;
    grid-gap: 5px;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    font-size: 14px;
    font-weight: 500;
    width: 100%;
    color: ${(props) => props.theme.colors.greyScale6};
`

const mapState: MapStateToProps<StateProps, OwnProps, RootState> = (state) => ({
    isBookmarked: selectors.isBookmarked(state),
    isDisabled: selectors.isDisabled(state),
})

const mapDispatch: (dispatch, props: OwnProps) => DispatchProps = (
    dispatch,
    props,
) => ({
    toggleBookmark: async (e) => {
        {
            const allowed = await pageActionAllowed()

            if (allowed) {
                e.preventDefault()
                await dispatch(acts.toggleBookmark())
            }
        }
    },
})

export default connect(mapState, mapDispatch)(BookmarkButton)

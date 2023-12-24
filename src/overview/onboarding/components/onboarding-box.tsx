import React, { PureComponent } from 'react'
import styled from 'styled-components'

const styles = require('./onboarding-box.css')

export interface Props {}

class OnboardingBox extends PureComponent<Props> {
    render() {
        return (
            <div>
                <FlexLayout>
                    <div className={styles.container}>
                        {this.props.children}
                    </div>
                    <div className={styles.black} />
                </FlexLayout>
            </div>
        )
    }
}

const FlexLayout = styled.div`
    display: flex;
    flex-direction: column;
    justify-content: center; /* We need the white box to sit in the middle of the screen */
    height: 100vh;
    align-items: center;
    overflow: hidden;
    background-color: ${(props) => props.theme.colors.black};
    width: 100vw;
    position: absolute;
`

export default OnboardingBox

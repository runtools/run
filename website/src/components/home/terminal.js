import shuffle from 'lodash/shuffle';
import React from 'react';
import PropTypes from 'prop-types';
import RadiumStarter from 'radium-starter';

export class Terminal extends React.Component {
  static propTypes = {
    commands: PropTypes.arrayOf(PropTypes.string).isRequired,
    style: PropTypes.object
  };

  shuffledCommands = shuffle(this.props.commands);

  commandIndex = 0;

  state = {typing: undefined};

  componentDidMount() {
    this.startTyping();
  }

  componentWillUnmount() {
    this.stopTyping();
  }

  startTyping() {
    this.refreshTyping();
  }

  stopTyping() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = undefined;
    }
  }

  refreshTyping() {
    if (this.command === undefined) {
      this.command = this.shuffledCommands[this.commandIndex];
      this.commandIndex++;
      if (this.commandIndex === this.shuffledCommands.length) {
        this.commandIndex = 0;
      }
      this.length = 1;
    } else {
      this.length++;
    }
    const typing = this.command.substr(0, this.length);
    this.setState({typing});
    let timeout;
    if (this.length < this.command.length) {
      timeout = Math.floor(Math.random() * 50) + 50;
    } else {
      this.command = undefined;
      timeout = 2000;
    }
    this.timeoutId = setTimeout(this.refreshTyping.bind(this), timeout);
  }

  render() {
    return (
      <RadiumStarter>
        {t => {
          const {style} = this.props;

          return (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                width: '512px',
                height: '320px',
                padding: '15px',
                backgroundColor: 'black',
                borderWidth: '2px',
                borderStyle: 'solid',
                borderColor: t.altBorderColor,
                borderRadius: '15px',
                [`@media (max-width: ${t.smallBreakpoint})`]: {
                  width: '300px',
                  height: '188px',
                  padding: '7px',
                  borderRadius: '7px'
                },
                ...style
              }}
            >
              <div
                style={{
                  flexGrow: 1,
                  display: 'flex',
                  alignItems: 'center',
                  padding: '15px',
                  backgroundColor: t.codeBackgroundColor,
                  [`@media (max-width: ${t.smallBreakpoint})`]: {
                    padding: '7px'
                  }
                }}
              >
                <span
                  style={{
                    fontFamily: t.monospaceFontFamily,
                    fontSize: '18px',
                    [`@media (max-width: ${t.smallBreakpoint})`]: {fontSize: '10px'}
                  }}
                >
                  <span style={{color: t.primaryColor}}>{'> '}</span>
                  {this.state.typing}
                  <div
                    style={[
                      {
                        display: 'inline-block',
                        backgroundColor: '#505050',
                        marginLeft: '3px',
                        width: '13px',
                        height: '23px',
                        verticalAlign: '-4px',
                        [`@media (max-width: ${t.smallBreakpoint})`]: {
                          marginLeft: '2px',
                          width: '8px',
                          height: '13px',
                          verticalAlign: '-2px'
                        }
                      }
                    ]}
                  />
                </span>
              </div>
            </div>
          );
        }}
      </RadiumStarter>
    );
  }
}

export default Terminal;

import React from 'react';
import 'react-datepicker/dist/react-datepicker.css';
import FeedbackMessage from '../feedbackMessage/FeedbackMessage';// Import the FeedbackMessage component
import './DeviceControl.scss';

const DeviceControl = ({ sendCommand, toggleBlockVehicle, isVehicleBlocked, feedback, closeFeedback}) => {

  return (
    <div className="card device-control-container">
      <h2 className="head">Device Control</h2>
      <div className="device-control-list">
      <button className="device-control-button lock-btn" onClick={() => sendCommand('lvcanclosealldoors')}>Lock All Doors</button>
      <button className="device-control-button unlock-btn" onClick={() => sendCommand('lvcanopenalldoors')}>Unlock All Doors</button>
      <button className="device-control-button block-btn" onClick={() => sendCommand('lvcanblockengine')}>Block Engine</button>
      <button className="device-control-button unblock-btn" onClick={() => sendCommand('lvcanunblockengine')}>Unblock Engine</button>
      {/* <button className="device-control-button trunk-btn" onClick={() => sendCommand('lvcanopentrunk')}>Open Trunk</button> */}
      <button className="device-control-button toggle-block-btn" onClick={toggleBlockVehicle}>
        {isVehicleBlocked ? 'Enable Acc' : 'Acc CutOff'}
      </button>
      {/* Incorporate FeedbackMessage component directly */}
      <FeedbackMessage feedback={feedback} closeFeedback={closeFeedback} />
          </div>
          </div>
  );
};

export default React.memo(DeviceControl);

import React, { useEffect, useState, useRef } from 'react';
import './VehicleEfficiencyNew.scss';

const calculateScores = (telemetryData, idleStartTime, scores) => {
  if (telemetryData.length === 0) return scores;

  const latestData = telemetryData[telemetryData.length - 1];
  console.log('Latest telemetry data:', latestData); // Log the latest data
  const speed = latestData['can.vehicle.speed'] || 0;
  const brakeStatus = latestData['can.pedal.brake.status'];
  const ignitionStatus = latestData['engine.ignition.status'];
  const timestamp = latestData['timestamp'] || 0;
  const fuelLevel = latestData['can.fuel.level'] || latestData['can.fuel.volume'] || 0 ;

  const brakingEvents = brakeStatus ? 1 : 0;
  const brakingIndex = brakingEvents * (speed / 100);
  const brakingScore = Math.max(0, 100 - brakingIndex);

  const speedingScore = speed <= 50 ? 100 : Math.max(0, 100 - (speed - 50));

  let idlingScore = 100;
  if (!ignitionStatus && speed === 0) {
    if (idleStartTime.current === 0) {
      idleStartTime.current = timestamp;
    }
    const idleTime = (timestamp - idleStartTime.current) / 60;
    idlingScore = Math.max(0, 100 - idleTime);
  } else {
    idleStartTime.current = 0;
  }

  const calculatedScores = { brakingScore, speedingScore, idlingScore, fuelLevel };
  console.log('Calculated scores:', calculatedScores); // Log the calculated scores

  return calculatedScores;
};

const VehicleEfficiency = ({ telemetryData }) => {
  const [scores, setScores] = useState({
    brakingScore: 100,
    speedingScore: 100,
    idlingScore: 100,
    fuelLevel: 0,
  });

  const idleStartTime = useRef(0);

  useEffect(() => {
    setScores((prevScores) => calculateScores(telemetryData, idleStartTime, prevScores));
  }, [telemetryData]);
  
  const Gauge = ({ value, label }) => {
    const needleStyle = {
      transform: `rotate(${(value / 100) * 180 - 90}deg)`,
      transformOrigin: '50% 100%', // Ensure the needle rotates around the correct point
    };
    const gradientId = `gradient-${label.replace(/\s+/g, '-')}`;

    return (
      <div className="gauge">
        <svg viewBox="0 0 100 50" className="gauge__svg">
          <defs>
            <linearGradient id={gradientId}>
              <stop offset="0%" stopColor="#9b59b6" />
              <stop offset="100%" stopColor="#e74c3c" />
            </linearGradient>
          </defs>
          <path
            className="gauge__background"
            d="M10 50 A 40 40 0 0 1 90 50"
            stroke="#333"
            strokeWidth="10"
            fill="none"
          />
          <path
            className="gauge__fill"
            d="M10 50 A 40 40 0 0 1 90 50"
            stroke={`url(#${gradientId})`}
            strokeWidth="10"
            fill="none"
            style={{ strokeDasharray: `${(value / 100) * 126}, 126` }}
          />
          <line
            className="gauge__needle"
            x1="50"
            y1="50"
            x2="50"
            y2="10"
            stroke="#fff"
            strokeWidth="3"
            style={needleStyle}
          />
                    <circle cx="50" cy="50" r="3" fill="#fff" /> {/* Needle base */}

        </svg>
        <div className="gauge__value">{value}</div>
        <div className="gauge__label">{label}</div>
      </div>
    );
  };

  return (
    <div className="cardd vehicle-efficiency-container">
      <h2>Vehicle Efficiency</h2>
      <div className="gauges">
        <Gauge value={scores.fuelLevel} label="Fuel Level" />
        <Gauge value={scores.brakingScore} label="Braking Score" />
        <Gauge value={scores.speedingScore} label="Speeding Score" />
        <Gauge value={scores.idlingScore} label="Idling Score" />
      </div>
    </div>
  );
};

export default React.memo(VehicleEfficiency);

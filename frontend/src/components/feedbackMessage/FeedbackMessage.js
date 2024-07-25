import React, { useCallback } from 'react';

const FeedbackMessage = ({ feedback, closeFeedback }) => {
  const handleClose = useCallback(() => {
    closeFeedback();
  }, [closeFeedback]);

  return feedback?.message && (
    <div className={`feedback-message ${feedback.type}`}>
      {feedback.message}
      <button className="feedback-close-btn" onClick={handleClose}>&times;</button>
    </div>
  );
};

export default React.memo(FeedbackMessage);

import React from 'react';
import '../styles/components/Button.css';

const Button = ({ children, type = "button", variant = "default", onClick }) => {
  return (
    <button
      type={type}
      onClick={onClick}
      className={`btn-component btn-${variant}`}
    >
      {children}
    </button>
  );
};

export default Button;

import React from "react";
import "../styles/components/Label.css";

const Label = ({ htmlFor, children, className = "" }) => {
  return (
    <label htmlFor={htmlFor} className={`label-component ${className}`}>
      {children}
    </label>
  );
};

export default Label;

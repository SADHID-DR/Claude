import React from 'react';

interface AppLogoProps {
  className?: string;
}

export const AppLogo: React.FC<AppLogoProps> = ({ className = "w-8" }) => {
  return (
    <svg viewBox="0 0 150 120" className={className} style={{ overflow: 'visible' }} xmlns="http://www.w3.org/2000/svg">
      {/* Shifted down to provide guaranteed padding at the top */}
      <polygon points="10,105 45,30 80,105" fill="#0060A9" />
      <polygon points="55,30 75,30 110,105 90,105" fill="#00AEEF" />
      <polygon points="85,30 105,30 140,105 120,105" fill="#F37021" />
    </svg>
  );
};

import React from 'react';
import emblemOnly from '../assets/waseem_autocare_emblem_only.png';
import logoWithName from '../assets/waseem_autocare_logo_with_name.png';

export default function Logo({ size = 42, showText = true, variant = 'dark' }) {
  const logo = showText ? logoWithName : emblemOnly;

  return (
    <img
      className={`brand-logo ${showText ? 'brand-logo-wordmark' : 'brand-logo-emblem'}`}
      src={logo}
      alt="Waseem AutoCare"
      data-variant={variant}
      style={{
        width: showText ? size * 3.1 : size,
        maxWidth: '100%',
        height: 'auto',
        objectFit: 'contain',
        display: 'block',
      }}
    />
  );
}

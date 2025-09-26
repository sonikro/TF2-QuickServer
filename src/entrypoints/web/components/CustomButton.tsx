'use client';

import { Button, styled } from '@mui/material';

interface CustomButtonProps {
  backgroundColor: string;
  color: string;
  buttonText: string;
  heroBtn?: boolean;
  guideBtn?: boolean;
  ctaBtn?: boolean;
}

const CustomButton = ({
  backgroundColor,
  color,
  buttonText,
  heroBtn,
  guideBtn,
  ctaBtn,
  ...props
}: CustomButtonProps & any) => {
  const StyledButton = styled(Button)(({ theme }) => ({
    backgroundColor: backgroundColor,
    color: color,
    fontWeight: '700',
    fontSize: '14px',
    cursor: 'pointer',
    padding: '0.75rem 2rem',
    borderRadius: '12px',
    textTransform: 'none',
    display: 'inline-block',
    border: '2px solid transparent',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
    '&:hover': {
      backgroundColor: color,
      color: backgroundColor,
      borderColor: backgroundColor,
      transform: 'translateY(-2px)',
      boxShadow: '0 6px 20px rgba(0, 0, 0, 0.15)',
    },
    [theme.breakpoints.down('md')]: {
      margin: (heroBtn || ctaBtn) && theme.spacing(0, 'auto', 3, 'auto'),
      width: (heroBtn || ctaBtn) && '90%',
      padding: '0.75rem 1.5rem',
    },
    [theme.breakpoints.down('sm')]: {
      marginTop: guideBtn && theme.spacing(3),
      width: guideBtn && '90%',
    },
  }));

  return <StyledButton {...props}>{buttonText}</StyledButton>;
};

export default CustomButton;

import React, { useEffect } from 'react';
import { router } from 'expo-router';

const Index: React.FC = () => {
  useEffect(() => {
    // Redirect to welcome screen
    router.replace('/welcome');
  }, []);

  return null;
};

export default Index;
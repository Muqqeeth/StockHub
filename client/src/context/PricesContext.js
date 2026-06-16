import React, { createContext, useContext, useCallback } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

const PricesContext = createContext({});

export const PricesProvider = ({ children }) => {
  const { updateUser } = useAuth();

  // Called when backend fires STOP_LOSS_TRIGGERED via WebSocket
  const handleStopLoss = useCallback((msg) => {
    // Update the balance in AuthContext so header/sidebar shows new balance immediately
    updateUser({ balance: msg.newBalance });

    // Show a toast notification
    toast.error(
      `🛑 Stop Loss Triggered!\n${msg.symbol}: ${msg.shares} shares sold at $${msg.price?.toFixed(2)}\nP&L: ${msg.pnl >= 0 ? '+' : ''}$${msg.pnl?.toFixed(2)} | New Balance: $${msg.newBalance?.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
      { duration: 6000 }
    );
  }, [updateUser]);

  const ws = useWebSocket(handleStopLoss);

  return <PricesContext.Provider value={ws}>{children}</PricesContext.Provider>;
};

export const usePrices = () => useContext(PricesContext);

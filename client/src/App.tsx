import React, { useState } from 'react';
import { ethers } from 'ethers';
import axios from 'axios';

const App: React.FC = () => {
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [account, setAccount] = useState<string>('');

  const connectWalletAndSignIn = async () => {
    if (window.ethereum) {
      try {
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        const providerInstance = new ethers.BrowserProvider(window.ethereum, 'rinkeby');
        setProvider(providerInstance);

        const signer = await providerInstance.getSigner();
        const address = await signer.getAddress();
        setAccount(address);

        // Request a nonce from the server
        const nonceResponse = await axios.post('http://localhost:3000/nonce', { address });
        const nonce = nonceResponse.data.nonce;

        // Sign the nonce with the user's wallet
        const signature = await signer.signMessage(nonce);

        // Send the signed nonce and wallet address to the server for verification
        const loginResponse = await axios.post('http://localhost:3000/login', {
          address,
          signature,
          nonce,
        });

        if (loginResponse.data.success) {
          const token = loginResponse.data.token;
          localStorage.setItem('jwtToken', token);
          // Redirect to a protected page or update the UI
        } else {
          console.error('Login failed');
        }
      } catch (error) {
        console.error('Error connecting wallet and signing in:', error);
      }
    } else {
      console.error('Ethereum wallet not detected');
    }
  };

  const fetchProtectedData = async () => {
    try {
      const token = localStorage.getItem('jwtToken');
      const response = await axios.get('http://localhost:3000/protected', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      // Handle the response data
    } catch (error) {
      console.error('Error fetching protected data:', error);
    }
  };

  return (
    <div>
      <h1>Wallet Authentication</h1>
      {!account ? (
        <button onClick={connectWalletAndSignIn}>Connect Wallet and Sign In</button>
      ) : (
        <div>
          <p>Connected Account: {account}</p>
          {/* Protected content */}
        </div>
      )}
      <br>
      </br>
      <button onClick={fetchProtectedData}>Check Protected</button>
    </div>
  );
};

export default App;
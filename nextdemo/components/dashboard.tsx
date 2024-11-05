'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Crown, Upload, ChevronDown, ChevronUp } from 'lucide-react'
import { toast } from 'sonner'
import { WalletService, WalletInfo } from '@/services/wallet.service'
import { Keypair, Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL, sendAndConfirmTransaction, clusterApiUrl, TransactionInstruction } from '@solana/web3.js';
import bs58 from 'bs58';
import type { DragEvent, ChangeEvent } from 'react';

export function DashboardComponent() {
  const [portfolioValue, setPortfolioValue] = useState('$0.00')
  const [image, setImage] = useState<File | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [showWalletGenerate, setShowWalletGenerate] = useState(false)
  const [showVolumeBot, setShowVolumeBot] = useState(false)
  const [showCommentBot, setShowCommentBot] = useState(false)
  const [walletCount, setWalletCount] = useState('')
  const [latency, setLatency] = useState('')
  const [solAmount, setSolAmount] = useState('')
  const [solAmountForWallet, setSolAmountForWallet] = useState('')
  const [isVolumeBotRunning, setIsVolumeBotRunning] = useState(false)
  const [isCommentBotRunning, setIsCommentBotRunning] = useState(false)
  const [funderPrivateKey, setFunderPrivateKey] = useState('');
  const [isFunding, setIsFunding] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedWallets, setGeneratedWallets] = useState<WalletInfo[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isAirdropping, setIsAirdropping] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null);
  const [showWalletList, setShowWalletList] = useState(false);
  const [isTransferringAll, setIsTransferringAll] = useState(false);
  const [tokenName, setTokenName] = useState('');
  const [tokenSymbol, setTokenSymbol] = useState('');
  const [twitterUrl, setTwitterUrl] = useState('');
  const [telegramUrl, setTelegramUrl] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [masterPrivateKey, setMasterPrivateKey] = useState('');
  const [showMasterWallet, setShowMasterWallet] = useState(false);
  const [masterWalletBalance, setMasterWalletBalance] = useState<number | null>(null);
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [profileDragActive, setProfileDragActive] = useState(false);
  const profileInputRef = useRef<HTMLInputElement>(null);
  const [portfolioChange15m, setPortfolioChange15m] = useState<string>('0.00');
  const [portfolioChangeDirection, setPortfolioChangeDirection] = useState<'up' | 'down' | 'neutral'>('neutral');
  const [lastWalletBalance, setLastWalletBalance] = useState<number | null>(null);

  const handleDrag = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setImage(e.dataTransfer.files[0])
    }
  }, [])

  const handleChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()
    if (e.target.files && e.target.files[0]) {
      setImage(e.target.files[0])
    }
  }, [])

  const handleFundWallets = () => {
    // Logic for funding wallets goes here
    setShowWalletGenerate(false)
  }

  const toggleVolumeBot = () => {
    setIsVolumeBotRunning(!isVolumeBotRunning)
    setShowVolumeBot(false)
  }

  const toggleCommentBot = () => {
    setIsCommentBotRunning(!isCommentBotRunning)
    setShowCommentBot(false)
  }

  const updateMasterWalletBalance = useCallback(async () => {
    if (masterPrivateKey) {
      try {
        const keypair = Keypair.fromSecretKey(bs58.decode(masterPrivateKey));
        const balance = await WalletService.getBalance(keypair.publicKey.toString());
        
        if (lastWalletBalance !== null) {
          const change = balance - lastWalletBalance;
          const changeUSD = change * 70; // Assuming 1 SOL = $70 USD
          setPortfolioChange15m(Math.abs(changeUSD).toFixed(2));
          setPortfolioChangeDirection(change > 0 ? 'up' : change < 0 ? 'down' : 'neutral');
        }
        
        setLastWalletBalance(balance);
        setMasterWalletBalance(balance);
        setPortfolioValue(`$${(balance * 70).toFixed(2)}`);
      } catch (error) {
        console.error('Error updating master wallet balance:', error);
      }
    }
  }, [masterPrivateKey, lastWalletBalance]);

  const handleGenerateWallets = useCallback(async () => {
    if (!masterPrivateKey || !walletCount || parseInt(walletCount) <= 0) {
      toast.error('Please enter valid wallet count and ensure master wallet is set up');
      return;
    }

    setIsGenerating(true);
    try {
      const count = parseInt(walletCount);
      const wallets = await WalletService.generateWalletsWithBalance(count);
      setGeneratedWallets(wallets);
      toast.success(`Successfully generated ${count} wallets`);
      
      if (solAmountForWallet && parseFloat(solAmountForWallet) > 0) {
        setIsFunding(true);
        const { success, failures } = await WalletService.fundWallets(
          wallets,
          parseFloat(solAmountForWallet),
          masterPrivateKey
        );
        
        if (success) {
          toast.success(`Successfully funded all wallets`);
          updateMasterWalletBalance(); // Update master wallet balance after funding
        } else {
          toast.error(`Failed to fund ${failures.length} wallets`);
        }
      }
    } catch (error) {
      toast.error('Failed to generate or fund wallets');
      console.error(error);
    } finally {
      setIsGenerating(false);
      setIsFunding(false);
      setShowWalletGenerate(false);
    }
  }, [walletCount, solAmountForWallet, masterPrivateKey, updateMasterWalletBalance]);

  const handleRequestAirdrop = async (publicKey: string) => {
    if (isAirdropping) return;
    
    setIsAirdropping(true);
    setSelectedWallet(publicKey);
    
    try {
      const success = await WalletService.requestAirdrop(publicKey);
      if (success) {
        toast.success('Airdrop successful');
        // Refresh wallet balances
        const updatedWallets = await Promise.all(
          generatedWallets.map(async (wallet) => ({
            ...wallet,
            balance: await WalletService.getBalance(wallet.publicKey)
          }))
        );
        setGeneratedWallets(updatedWallets);
      } else {
        toast.error('Airdrop failed');
      }
    } catch (error) {
      toast.error('Failed to request airdrop');
      console.error(error);
    } finally {
      setIsAirdropping(false);
      setSelectedWallet(null);
    }
  };

  const handleExportWallets = async () => {
    try {
      const exportData = await WalletService.exportWallets(generatedWallets);
      const blob = new Blob([exportData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'wallets.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error('Failed to export wallets');
      console.error(error);
    }
  };

  const handleTransferAll = async () => {
    if (!funderPrivateKey || isTransferringAll) return;
    
    setIsTransferringAll(true);
    try {
      const fromKeypair = Keypair.fromSecretKey(bs58.decode(funderPrivateKey));
      const { success, totalTransferred } = await WalletService.transferAllToFunder(
        generatedWallets,
        fromKeypair.publicKey.toString()
      );
      
      if (success) {
        toast.success(`Successfully transferred ${totalTransferred.toFixed(4)} SOL to funder wallet`);
        // Refresh wallet balances
        const updatedWallets = await Promise.all(
          generatedWallets.map(async (wallet) => ({
            ...wallet,
            balance: await WalletService.getBalance(wallet.publicKey)
          }))
        );
        setGeneratedWallets(updatedWallets);
      } else {
        toast.error('Failed to transfer funds');
      }
    } catch (error) {
      toast.error('Failed to transfer funds');
      console.error(error);
    } finally {
      setIsTransferringAll(false);
    }
  };

  useEffect(() => {
    updateMasterWalletBalance();
    const interval = setInterval(updateMasterWalletBalance, 10000); // Update every 10 seconds
    return () => clearInterval(interval);
  }, [masterPrivateKey, updateMasterWalletBalance]);

  // Update the WalletsSection:
  const WalletsSection = (
    <div className="bg-[#E9967A] p-4 rounded-lg">
      <h2 className="text-xl font-bold mb-4">wallets</h2>
      <div className="space-y-4">
        {/* Master Wallet Card */}
        <Card className="bg-white/90">
          <Button 
            className="w-full bg-white hover:bg-gray-50 text-gray-800 border-b border-gray-200 rounded-t-lg rounded-b-none flex justify-between items-center"
            onClick={() => setShowMasterWallet(!showMasterWallet)}
          >
            <span className="font-medium">Master Wallet</span>
            {showMasterWallet ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </Button>
          
          {showMasterWallet && (
            <div className="p-4 space-y-3">
              <div className="space-y-2">
                <label className="text-sm text-gray-600 block">Private Key</label>
                <Input 
                  placeholder="Enter master wallet private key" 
                  type="password"
                  value={masterPrivateKey}
                  onChange={(e) => setMasterPrivateKey(e.target.value)}
                  className="bg-white"
                />
              </div>
              
              {masterWalletBalance !== null && (
                <div className="bg-gray-50 p-3 rounded-md flex justify-between items-center">
                  <span className="text-sm text-gray-600">Balance:</span>
                  <span className="text-sm bg-emerald-50 text-emerald-600 px-2 py-1 rounded-full font-medium">
                    {masterWalletBalance.toFixed(4)} SOL
                  </span>
                </div>
              )}
              
              <Button
                className="w-full bg-white hover:bg-gray-50 text-gray-800 border border-gray-200"
                onClick={() => {
                  setMasterPrivateKey('');
                  setMasterWalletBalance(null);
                  setPortfolioValue('$0.00');
                }}
              >
                Change Wallet
              </Button>
            </div>
          )}
        </Card>

        {/* Generate Wallets Card - Updated to use master wallet */}
        <Card className="bg-white/90">
          <Button 
            className="w-full bg-white hover:bg-gray-50 text-gray-800 border-b border-gray-200 rounded-t-lg rounded-b-none flex justify-between items-center"
            onClick={() => setShowWalletGenerate(!showWalletGenerate)}
          >
            <span className="font-medium">Generate Wallets</span>
            {showWalletGenerate ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </Button>
          
          {showWalletGenerate && (
            <div className="p-4 space-y-3">
              {!masterPrivateKey && (
                <div className="bg-orange-50 text-orange-600 p-3 rounded-md text-sm">
                  Please set up your master wallet first
                </div>
              )}
              
              <div className="space-y-2">
                <label className="text-sm text-gray-600 block">Number of Wallets</label>
                <Input 
                  placeholder="Enter number of wallets" 
                  type="number" 
                  value={walletCount}
                  onChange={(e) => setWalletCount(e.target.value)}
                  className="bg-white"
                  disabled={!masterPrivateKey}
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm text-gray-600 block">SOL per Wallet</label>
                <Input 
                  placeholder="Enter SOL amount" 
                  type="number" 
                  value={solAmountForWallet}
                  onChange={(e) => setSolAmountForWallet(e.target.value)}
                  className="bg-white"
                  disabled={!masterPrivateKey}
                />
              </div>
              
              <Button 
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white transition-colors h-10"
                onClick={handleGenerateWallets}
                disabled={!masterPrivateKey || isGenerating || isFunding}
              >
                {isGenerating ? 'Generating...' : isFunding ? 'Funding...' : 'Generate & Fund'}
              </Button>
            </div>
          )}
        </Card>

        {/* Generated Wallets List */}
        {generatedWallets.length > 0 && (
          <Card className="bg-white/90">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <Button
                  className="flex items-center gap-2 hover:bg-gray-50"
                  onClick={() => setShowWalletList(!showWalletList)}
                >
                  <span className="font-medium">Generated Wallets ({generatedWallets.length})</span>
                  {showWalletList ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </Button>
                <div className="flex gap-2">
                  <Button
                    className="bg-white hover:bg-gray-50 text-gray-800 border border-gray-200"
                    onClick={handleExportWallets}
                  >
                    Export
                  </Button>
                  <Button
                    className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200"
                    onClick={handleTransferAll}
                    disabled={isTransferringAll}
                  >
                    {isTransferringAll ? 'Transferring...' : 'Transfer All'}
                  </Button>
                </div>
              </div>
            </div>

            {showWalletList && (
              <div className="max-h-[400px] overflow-y-auto p-4 space-y-3">
                {generatedWallets.map((wallet, index) => (
                  <Card key={wallet.publicKey} className="p-4 border border-gray-200 bg-white">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium text-gray-800">Wallet {index + 1}</span>
                      <span className="text-sm bg-emerald-50 text-emerald-600 px-2 py-1 rounded-full font-medium">
                        {wallet.balance?.toFixed(4) || '0'} SOL
                      </span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="bg-gray-50 p-2 rounded-md">
                        <span className="text-gray-500">Public Key:</span>
                        <p className="font-mono text-gray-800 break-all">{wallet.publicKey}</p>
                      </div>
                      <div className="bg-gray-50 p-2 rounded-md">
                        <span className="text-gray-500">Private Key:</span>
                        <p className="font-mono text-gray-800 break-all">{wallet.privateKey}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex justify-end">
                      <Button
                        className="bg-white hover:bg-gray-50 text-gray-800 border border-gray-200"
                        onClick={() => handleRequestAirdrop(wallet.publicKey)}
                        disabled={isAirdropping && selectedWallet === wallet.publicKey}
                      >
                        {isAirdropping && selectedWallet === wallet.publicKey 
                          ? 'Airdropping...' 
                          : 'Request Airdrop'}
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </Card>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button 
            className="w-full bg-white hover:bg-gray-50 text-gray-800 border border-gray-200 shadow-sm h-10"
            onClick={() => setGeneratedWallets([])}
          >
            Clear Wallets
          </Button>
          
          <Button 
            className="w-full bg-red-500 hover:bg-red-600 text-white transition-colors h-10"
          >
            Sell All
          </Button>
        </div>
      </div>
    </div>
  );

  // Update the BotsSection:
  const BotsSection = (
    <div className="bg-[#E9967A] p-4 rounded-lg">
      <h2 className="text-xl font-bold mb-4">bots</h2>
      <div className="space-y-4">
        {/* Volume Bot Card */}
        <Card className="bg-white/90">
          <Button 
            className="w-full bg-white hover:bg-gray-50 text-gray-800 border-b border-gray-200 rounded-t-lg rounded-b-none flex justify-between items-center"
            onClick={() => setShowVolumeBot(!showVolumeBot)}
          >
            <span className="font-medium">Volume Bot</span>
            {showVolumeBot ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </Button>
          
          {showVolumeBot && (
            <div className="p-4 space-y-3">
              <div className="space-y-2">
                <label className="text-sm text-gray-600 block">Latency (ms)</label>
                <Input 
                  placeholder="Enter latency" 
                  type="number" 
                  value={latency}
                  onChange={(e) => setLatency(e.target.value)}
                  className="bg-white"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm text-gray-600 block">SOL Amount</label>
                <Input 
                  placeholder="Enter SOL amount" 
                  type="number" 
                  value={solAmount}
                  onChange={(e) => setSolAmount(e.target.value)}
                  className="bg-white"
                />
              </div>
              
              <Button 
                className={`w-full h-10 ${
                  isVolumeBotRunning 
                    ? 'bg-red-500 hover:bg-red-600' 
                    : 'bg-emerald-500 hover:bg-emerald-600'
                } text-white transition-colors`}
                onClick={toggleVolumeBot}
              >
                {isVolumeBotRunning ? 'Stop Bot' : 'Start Bot'}
              </Button>
            </div>
          )}
        </Card>

        {/* Comment Bot Card */}
        <Card className="bg-white/90">
          <Button 
            className="w-full bg-white hover:bg-gray-50 text-gray-800 border-b border-gray-200 rounded-t-lg rounded-b-none flex justify-between items-center"
            onClick={() => setShowCommentBot(!showCommentBot)}
          >
            <span className="font-medium">Comment Bot</span>
            {showCommentBot ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </Button>
          
          {showCommentBot && (
            <div className="p-4">
              <Button 
                className={`w-full h-10 ${
                  isCommentBotRunning 
                    ? 'bg-red-500 hover:bg-red-600' 
                    : 'bg-emerald-500 hover:bg-emerald-600'
                } text-white transition-colors`}
                onClick={toggleCommentBot}
              >
                {isCommentBotRunning ? 'Stop Bot' : 'Start Bot'}
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );

  // Add this section where the memetime UI is rendered
  const MemetimeSection = (
    <div className="bg-[#E9967A] p-4 rounded-lg">
      <h2 className="text-xl font-bold mb-4">memetime</h2>
      <div className="space-y-4">
        {/* Token Details */}
        <Card className="p-4 bg-white/90">
          <h3 className="font-medium text-gray-700 mb-3">Token Details</h3>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-gray-600 block mb-1">Token Name</label>
              <Input 
                placeholder="Enter token name" 
                className="bg-white"
                value={tokenName}
                onChange={(e) => setTokenName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm text-gray-600 block mb-1">Token Symbol</label>
              <Input 
                placeholder="Enter token symbol (e.g. MEME)" 
                className="bg-white"
                maxLength={5}
                value={tokenSymbol}
                onChange={(e) => setTokenSymbol(e.target.value)}
              />
            </div>
          </div>
        </Card>

        {/* Social Links */}
        <Card className="p-4 bg-white/90">
          <h3 className="font-medium text-gray-700 mb-3">Social Links</h3>
          <div className="space-y-3">
            <div className="relative">
              <div className="absolute left-3 top-2.5 text-gray-500">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M23.643 4.937c-.835.37-1.732.62-2.675.733.962-.576 1.7-1.49 2.048-2.578-.9.534-1.897.922-2.958 1.13-.85-.904-2.06-1.47-3.4-1.47-2.572 0-4.658 2.086-4.658 4.66 0 .364.042.718.12 1.06-3.873-.195-7.304-2.05-9.602-4.868-.4.69-.63 1.49-.63 2.342 0 1.616.823 3.043 2.072 3.878-.764-.025-1.482-.234-2.11-.583v.06c0 2.257 1.605 4.14 3.737 4.568-.392.106-.803.162-1.227.162-.3 0-.593-.028-.877-.082.593 1.85 2.313 3.198 4.352 3.234-1.595 1.25-3.604 1.995-5.786 1.995-.376 0-.747-.022-1.112-.065 2.062 1.323 4.51 2.093 7.14 2.093 8.57 0 13.255-7.098 13.255-13.254 0-.2-.005-.402-.014-.602.91-.658 1.7-1.477 2.323-2.41z"/>
                </svg>
              </div>
              <Input 
                placeholder="Twitter profile URL" 
                className="bg-white pl-10"
                value={twitterUrl}
                onChange={(e) => setTwitterUrl(e.target.value)}
              />
            </div>
            
            <div className="relative">
              <div className="absolute left-3 top-2.5 text-gray-500">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.47-1.13 7.29-.14.77-.42 1.03-.68 1.06-.58.06-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.12.02-1.96 1.25-5.54 3.69-.52.36-1 .53-1.42.52-.47-.01-1.37-.26-2.03-.48-.82-.27-1.47-.42-1.42-.88.03-.24.27-.48.74-.74 2.87-1.25 4.79-2.08 5.76-2.5 2.73-1.18 3.3-1.39 3.67-1.39.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
                </svg>
              </div>
              <Input 
                placeholder="Telegram group URL" 
                className="bg-white pl-10"
                value={telegramUrl}
                onChange={(e) => setTelegramUrl(e.target.value)}
              />
            </div>

            <div className="relative">
              <div className="absolute left-3 top-2.5 text-gray-500">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                </svg>
              </div>
              <Input 
                placeholder="Website URL" 
                className="bg-white pl-10"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
              />
            </div>
          </div>
        </Card>

        {/* Logo Upload */}
        <Card className="p-4 bg-white/90">
          <h3 className="font-medium text-gray-700 mb-3">Token Logo</h3>
          <div 
            className={`bg-gray-50 h-24 rounded-lg flex flex-col items-center justify-center relative cursor-pointer border-2 border-dashed ${
              dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
            } transition-colors`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              type="file"
              id="image-upload"
              className="hidden"
              accept="image/*"
              onChange={handleChange}
              ref={fileInputRef}
            />
            <label 
              htmlFor="image-upload" 
              className="cursor-pointer flex flex-col items-center justify-center w-full h-full"
            >
              <Upload className="w-6 h-6 text-gray-400 mb-2" />
              <p className="text-sm text-gray-500">
                {image ? image.name : 'Upload token logo (PNG/JPG)'}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Recommended: 200x200px
              </p>
            </label>
          </div>
        </Card>

        {/* Create Token Button */}
        <Button 
          className="w-full bg-emerald-600 hover:bg-emerald-700 h-12 text-base font-medium"
          onClick={() => {
            if (!masterPrivateKey) {
              toast.error('Please set up your master wallet first');
              return;
            }
            const params = new URLSearchParams({
              name: tokenName,
              symbol: tokenSymbol,
              twitter: twitterUrl,
              telegram: telegramUrl,
              website: websiteUrl,
              wallet: Keypair.fromSecretKey(bs58.decode(masterPrivateKey)).publicKey.toString()
            });
            window.open(`https://pump.fun/create?${params.toString()}`, '_blank');
          }}
          disabled={!masterPrivateKey}
        >
          Create Token on Pump.fun
        </Button>
      </div>
    </div>
  );

  const handleProfileDrag = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setProfileDragActive(true);
    } else if (e.type === "dragleave") {
      setProfileDragActive(false);
    }
  }, []);

  const handleProfileDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setProfileDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setProfileImage(e.dataTransfer.files[0]);
    }
  }, []);

  const handleProfileChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      setProfileImage(e.target.files[0]);
    }
  }, []);

  return (
    <div className="min-h-screen bg-background p-4">
      {/* Combined Header and Portfolio Section */}
      <div className="mb-4 grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Header Section - Takes 30% */}
        <div className="md:col-span-1 bg-[#E9967A] p-4 rounded-lg flex justify-center items-center">
          <div className="flex flex-col items-center gap-3">
            <div 
              className={`relative w-20 h-20 overflow-hidden cursor-pointer ${
                profileDragActive ? 'ring-4 ring-blue-500 ring-opacity-50' : ''
              }`}
              onDragEnter={handleProfileDrag}
              onDragLeave={handleProfileDrag}
              onDragOver={handleProfileDrag}
              onDrop={handleProfileDrop}
              onClick={() => profileInputRef.current?.click()}
            >
              <input
                ref={profileInputRef}
                type="file"
                className="hidden"
                accept="image/*"
                onChange={handleProfileChange}
              />
              {profileImage ? (
                <img 
                  src={URL.createObjectURL(profileImage)}
                  alt="Profile"
                  className="w-full h-full rounded-full object-cover shadow-lg"
                />
              ) : (
                <div className="w-full h-full rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center shadow-lg">
                  <Upload className="w-8 h-8 text-gray-400" />
                </div>
              )}
              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-30 transition-all duration-300 rounded-full flex items-center justify-center">
                <Upload className="w-8 h-8 text-white opacity-0 hover:opacity-100 transform hover:scale-110 transition-all duration-300" />
              </div>
            </div>
            <div className="text-center">
              <h1 className="text-2xl font-extrabold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent drop-shadow-sm">
                MUNENE
              </h1>
              <p className="text-base font-bold text-red-600 tracking-wider uppercase bg-white bg-opacity-20 px-3 py-1 rounded-full shadow-sm">
                memefun
              </p>
            </div>
          </div>
        </div>

        {/* Portfolio Section - Takes 70% */}
        <div className="md:col-span-3 bg-emerald-600 p-6 rounded-lg flex justify-between items-center">
          <div className="text-white">
            <p className="text-xl">portfolio</p>
            <p className="text-5xl font-bold mt-2">{portfolioValue}</p>
          </div>
          
          <div className="text-right">
            <div className="mb-4">
              <p className="text-white/80 text-sm mb-1">15m Change</p>
              <div className={`text-2xl font-bold flex items-center justify-end gap-1
                ${portfolioChangeDirection === 'up' ? 'text-green-300' : 
                  portfolioChangeDirection === 'down' ? 'text-red-300' : 
                  'text-white/90'}`}
              >
                {portfolioChangeDirection === 'up' && (
                  <>
                    +${portfolioChange15m}
                    <ChevronUp className="w-6 h-6" />
                  </>
                )}
                {portfolioChangeDirection === 'down' && (
                  <>
                    -${portfolioChange15m}
                    <ChevronDown className="w-6 h-6" />
                  </>
                )}
                {portfolioChangeDirection === 'neutral' && (
                  <>
                    ${portfolioChange15m}
                    <span className="w-6 h-6">―</span>
                  </>
                )}
              </div>
            </div>
            
            <div>
              <p className="text-white/80 text-sm mb-1">Wallet Change</p>
              <div className={`text-lg font-medium flex items-center justify-end gap-1
                ${masterWalletBalance && lastWalletBalance 
                  ? masterWalletBalance > lastWalletBalance 
                    ? 'text-green-300' 
                    : masterWalletBalance < lastWalletBalance 
                      ? 'text-red-300' 
                      : 'text-white/90'
                  : 'text-white/90'}`}
              >
                {masterWalletBalance && lastWalletBalance && (
                  <>
                    {masterWalletBalance > lastWalletBalance ? '+' : 
                     masterWalletBalance < lastWalletBalance ? '-' : ''}
                    {((Math.abs(masterWalletBalance - (lastWalletBalance || 0))) * 70).toFixed(2)} SOL
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left Column - Memetime */}
        <div>
          {MemetimeSection}
        </div>

        {/* Right Column - Chart, Wallets, and Bots */}
        <div className="space-y-4">
          <Card className="bg-black p-4 rounded-lg h-[300px] flex items-center justify-center">
            <p className="text-gray-500">Chart Area</p>
          </Card>
          
          {WalletsSection}
          {BotsSection}
        </div>
      </div>
    </div>
  )
}
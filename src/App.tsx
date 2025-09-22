import React, { useState, useEffect, useCallback, useRef } from 'react';

interface TypingStats {
  wpm: number;
  accuracy: number;
  totalChars: number;
  correctChars: number;
  incorrectChars: number;
  timeElapsed: number;
}

const SAMPLE_TEXTS = [
  "The quick brown fox jumps over the lazy dog. This pangram contains every letter of the alphabet and is commonly used for typing practice.",
  "In a hole in the ground there lived a hobbit. Not a nasty, dirty, wet hole, filled with the ends of worms and an oozy smell, nor yet a dry, bare, sandy hole with nothing in it to sit down on or to eat.",
  "It was the best of times, it was the worst of times, it was the age of wisdom, it was the age of foolishness, it was the epoch of belief, it was the epoch of incredulity.",
  "All human beings are born free and equal in dignity and rights. They are endowed with reason and conscience and should act towards one another in a spirit of brotherhood.",
  "To be or not to be, that is the question. Whether tis nobler in the mind to suffer the slings and arrows of outrageous fortune, or to take arms against a sea of troubles."
];

const TEST_DURATIONS = [30, 60, 120, 180]; // in seconds

function App() {
  const [testStarted, setTestStarted] = useState(false);
  const [testCompleted, setTestCompleted] = useState(false);
  const [currentText, setCurrentText] = useState('');
  const [userInput, setUserInput] = useState('');
  const [timeLeft, setTimeLeft] = useState(60);
  const [selectedDuration, setSelectedDuration] = useState(60);
  const [currentCharIndex, setCurrentCharIndex] = useState(0);
  const [stats, setStats] = useState<TypingStats>({
    wpm: 0,
    accuracy: 0,
    totalChars: 0,
    correctChars: 0,
    incorrectChars: 0,
    timeElapsed: 0
  });
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark' || 
           (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const intervalRef = useRef<number | null>(null);

  // Generate random text for the test
  const generateTestText = useCallback(() => {
    const randomIndex = Math.floor(Math.random() * SAMPLE_TEXTS.length);
    return SAMPLE_TEXTS[randomIndex];
  }, []);

  // Calculate typing statistics
  const calculateStats = useCallback((input: string, text: string, timeElapsed: number) => {
    const totalChars = input.length;
    let correctChars = 0;
    
    for (let i = 0; i < input.length; i++) {
      if (i < text.length && input[i] === text[i]) {
        correctChars++;
      }
    }
    
    const incorrectChars = totalChars - correctChars;
    const accuracy = totalChars > 0 ? (correctChars / totalChars) * 100 : 100;
    const wordsTyped = totalChars / 5; // Standard: 5 characters = 1 word
    const timeInMinutes = timeElapsed / 60;
    const wpm = timeInMinutes > 0 ? Math.round(wordsTyped / timeInMinutes) : 0;

    return {
      wpm,
      accuracy: Math.round(accuracy * 100) / 100,
      totalChars,
      correctChars,
      incorrectChars,
      timeElapsed
    };
  }, []);

  // Start the typing test
  const startTest = useCallback(() => {
    const text = generateTestText();
    setCurrentText(text);
    setUserInput('');
    setCurrentCharIndex(0);
    setTimeLeft(selectedDuration);
    setTestStarted(true);
    setTestCompleted(false);
    
    // Focus on input
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);

    // Start timer
    intervalRef.current = window.setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [selectedDuration, generateTestText]);

  // End the test
  const endTest = useCallback(() => {
    setTestStarted(false);
    setTestCompleted(true);
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
    }
    
    const finalStats = calculateStats(userInput, currentText, selectedDuration - timeLeft);
    setStats(finalStats);
  }, [userInput, currentText, selectedDuration, timeLeft, calculateStats]);

  // Handle user input
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    
    // Prevent input beyond the text length
    if (value.length > currentText.length) {
      return;
    }
    
    setUserInput(value);
    setCurrentCharIndex(value.length);
    
    // Update real-time stats
    if (testStarted && !testCompleted) {
      const currentStats = calculateStats(value, currentText, selectedDuration - timeLeft);
      setStats(currentStats);
    }
  }, [currentText, testStarted, testCompleted, selectedDuration, timeLeft, calculateStats]);

  // Handle key press events
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      if (!testStarted && !testCompleted) {
        startTest();
      }
    }
    
    if (e.key === 'Escape') {
      e.preventDefault();
      if (testStarted) {
        endTest();
      }
    }
  }, [testStarted, testCompleted, startTest, endTest]);

  // Restart test
  const restartTest = useCallback(() => {
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
    }
    setTestStarted(false);
    setTestCompleted(false);
    setUserInput('');
    setCurrentCharIndex(0);
    setTimeLeft(selectedDuration);
    setStats({
      wpm: 0,
      accuracy: 0,
      totalChars: 0,
      correctChars: 0,
      incorrectChars: 0,
      timeElapsed: 0
    });
  }, [selectedDuration]);

  // Handle test completion when time runs out
  useEffect(() => {
    if (testStarted && timeLeft === 0) {
      endTest();
    }
  }, [testStarted, timeLeft, endTest]);

  // Toggle dark mode
  const toggleDarkMode = useCallback(() => {
    setIsDarkMode(prev => {
      const newMode = !prev;
      localStorage.setItem('theme', newMode ? 'dark' : 'light');
      return newMode;
    });
  }, []);

  // Apply dark mode class to body
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Render character with styling based on correctness
  const renderText = () => {
    return currentText.split('').map((char, index) => {
      let className = 'text-gray-400 dark:text-gray-500';
      
      if (index < userInput.length) {
        if (userInput[index] === char) {
          className = 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30';
        } else {
          className = 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30';
        }
      } else if (index === currentCharIndex) {
        className = 'text-gray-900 dark:text-gray-100 bg-blue-200 dark:bg-blue-800 animate-pulse';
      }
      
      return (
        <span key={index} className={className}>
          {char}
        </span>
      );
    });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      isDarkMode ? 'dark bg-gray-900 text-gray-100' : 'bg-gray-50 text-gray-900'
    }`}>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2 text-blue-600 dark:text-blue-400">
            SpeedWriter
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Test your typing speed and accuracy
          </p>
          
          {/* Theme Toggle */}
          <button
            onClick={toggleDarkMode}
            className="mt-4 p-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            aria-label="Toggle dark mode"
          >
            {isDarkMode ? '☀️' : '🌙'}
          </button>
        </header>

        {/* Test Configuration */}
        {!testStarted && !testCompleted && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Test Settings</h2>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Duration</label>
              <div className="flex gap-2 flex-wrap">
                {TEST_DURATIONS.map(duration => (
                  <button
                    key={duration}
                    onClick={() => setSelectedDuration(duration)}
                    className={`px-4 py-2 rounded-md transition-colors ${
                      selectedDuration === duration
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500'
                    }`}
                  >
                    {duration}s
                  </button>
                ))}
              </div>
            </div>
            
            <button
              onClick={startTest}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-md transition-colors"
            >
              Start Test (or press Tab)
            </button>
          </div>
        )}

        {/* Statistics Bar */}
        {(testStarted || testCompleted) && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 mb-6">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {formatTime(timeLeft)}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Time</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {stats.wpm}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">WPM</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {stats.accuracy}%
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Accuracy</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {stats.correctChars}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Correct</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {stats.incorrectChars}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Errors</div>
              </div>
            </div>
          </div>
        )}

        {/* Typing Area */}
        {(testStarted || testCompleted) && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
            {/* Text Display */}
            <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-md leading-relaxed text-lg font-mono">
              {renderText()}
            </div>
            
            {/* Input Area */}
            <textarea
              ref={inputRef}
              value={userInput}
              onChange={handleInputChange}
              onKeyDown={handleKeyPress}
              disabled={testCompleted}
              className="w-full h-32 p-4 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 font-mono text-lg resize-none"
              placeholder={testStarted ? "Start typing here..." : "Test completed!"}
            />
            
            {testStarted && (
              <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                Press Escape to end test early
              </div>
            )}
          </div>
        )}

        {/* Results */}
        {testCompleted && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-2xl font-bold mb-4 text-center">Test Results</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span>Words Per Minute:</span>
                  <span className="font-bold text-blue-600 dark:text-blue-400">{stats.wpm}</span>
                </div>
                <div className="flex justify-between">
                  <span>Accuracy:</span>
                  <span className="font-bold text-green-600 dark:text-green-400">{stats.accuracy}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Test Duration:</span>
                  <span className="font-bold">{selectedDuration}s</span>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span>Characters Typed:</span>
                  <span className="font-bold">{stats.totalChars}</span>
                </div>
                <div className="flex justify-between">
                  <span>Correct Characters:</span>
                  <span className="font-bold text-green-600 dark:text-green-400">{stats.correctChars}</span>
                </div>
                <div className="flex justify-between">
                  <span>Incorrect Characters:</span>
                  <span className="font-bold text-red-600 dark:text-red-400">{stats.incorrectChars}</span>
                </div>
              </div>
            </div>
            
            <div className="mt-6 flex gap-4 justify-center">
              <button
                onClick={restartTest}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-md transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={() => {
                  restartTest();
                  setTimeout(startTest, 100);
                }}
                className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-6 rounded-md transition-colors"
              >
                New Test
              </button>
            </div>
          </div>
        )}

        {/* Instructions */}
        {!testStarted && !testCompleted && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h3 className="font-semibold text-blue-800 dark:text-blue-300 mb-2">Instructions:</h3>
            <ul className="text-blue-700 dark:text-blue-300 text-sm space-y-1">
              <li>• Choose your preferred test duration</li>
              <li>• Click "Start Test" or press Tab to begin</li>
              <li>• Type the text exactly as shown</li>
              <li>• Correct characters turn green, incorrect ones turn red</li>
              <li>• Press Escape to end the test early</li>
              <li>• Your WPM and accuracy are calculated in real-time</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
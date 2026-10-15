import { useState } from "react";
import { LoginPage } from "./features/auth/LoginPage";
import { SignupPage } from "./features/auth/SignupPage";
import "./App.css";

function App() {
  const [showSignup, setShowSignup] = useState(false);

  return (
    <main className="app">
      {showSignup ? (
        <SignupPage onLogin={() => setShowSignup(false)} />
      ) : (
        <LoginPage onSignup={() => setShowSignup(true)} />
      )}
    </main>
  );
}

export default App;
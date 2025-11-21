import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../firebase/firebaseConfig';
import './styles/LoginPage.css';

const LoginPage = () => {
  const handleGoogleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="login-page">
      <button onClick={handleGoogleSignIn} className="login-button">
        Sign in with Google
      </button>
    </div>
  );
};

export default LoginPage;

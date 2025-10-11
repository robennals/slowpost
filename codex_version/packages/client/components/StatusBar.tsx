import Link from 'next/link';
import { AppBar, AppBarAction, AppBarTitle } from '../style';

type StatusBarProps = {
  isLoggedIn: boolean;
  username?: string;
};

export function StatusBar({ isLoggedIn, username }: StatusBarProps) {
  return (
    <AppBar>
      <AppBarTitle as={Link} href="/">
        Slowpost
      </AppBarTitle>
      {isLoggedIn ? (
        <AppBarAction as={Link} href={`/${username ?? ''}`}>
          Profile
        </AppBarAction>
      ) : (
        <AppBarAction as={Link} href="/p/login">
          Login
        </AppBarAction>
      )}
    </AppBar>
  );
}

export default StatusBar;

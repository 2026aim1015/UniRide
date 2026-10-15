type Props = { email?: string; isAdmin: boolean; onLogout: () => void };

export function Navbar({ email, isAdmin, onLogout }: Props) {
  return (
    <header className="navbar">
      <a className="brand" href="#bicycles" aria-label="UniRide home"><span className="brand-mark">U</span> UniRide</a>
      <nav aria-label="Main navigation">
        <a href="#bicycles">Bicycles</a>
        <a href="#rides">My rides</a>
        <a href="#reports">Report issue</a>
        {isAdmin && <a href="#admin">Admin</a>}
      </nav>
      <div className="account">
        {email && <span title={email}>{email}</span>}
        <button type="button" className="button button-quiet" onClick={onLogout}>Log out</button>
      </div>
    </header>
  );
}

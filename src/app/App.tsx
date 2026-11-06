import { SoundEffectsProvider } from '../providers/SoundEffectsProvider';
import { DeviceGuide } from '../components/layout/DeviceGuide';
import { LoginPage } from '../pages/LoginPage';
import { ProfileLoader } from '../components/auth/ProfileLoader';
import { TownPage } from '../pages/TownPage';
export function App() {
  return (
    <SoundEffectsProvider>
      <DeviceGuide>
        <LoginPage>
          {(account) => (
            <ProfileLoader key={account.id} account={account}>
              {(initial) => <TownPage account={account} initial={initial} />}
            </ProfileLoader>
          )}
        </LoginPage>
      </DeviceGuide>
    </SoundEffectsProvider>
  );
}

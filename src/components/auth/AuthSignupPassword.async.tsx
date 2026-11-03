import { Bundles } from '../../util/moduleLoader';

import useModuleLoader from '../../hooks/useModuleLoader';

import Loading from '../ui/Loading';

const AuthSignupPasswordAsync = () => {
  const AuthSignupPassword = useModuleLoader(Bundles.Auth, 'AuthSignupPassword');

  return AuthSignupPassword ? <AuthSignupPassword /> : <Loading />;
};

export default AuthSignupPasswordAsync;

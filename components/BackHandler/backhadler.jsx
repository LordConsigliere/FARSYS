import { useEffect } from 'react';
import { BackHandler } from 'react-native';
import { router, usePathname } from 'expo-router';

export const useCustomBackHandler = () => {
  const pathname = usePathname();

  useEffect(() => {
    console.log('Current Pathname:', pathname);

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        console.log('Back Button Pressed - Current Pathname:', pathname);

        if (pathname === '/Student/home' || pathname === '/Teacher/TeacherDashboard' || pathname === '/Admin/HomepageAdmin') {
          console.log('Exiting App');
          BackHandler.exitApp();
          return true;
        } else if (pathname.startsWith('/Student/')) {
          console.log('Navigating to Student Home');
          router.replace('/Student/home');
          return true;
        } else if (pathname.startsWith('/Teacher/')) {
          console.log('Navigating to Teacher Dashboard');
          router.replace('/Teacher/TeacherDashboard');
          return true;
        }else if (pathname.startsWith('/Admin/')) {
          console.log('Navigating to Admin');
          router.replace('/Admin/HomepageAdmin');
          return true;
        }
        return true;
      }
    );

    return () => backHandler.remove();
  }, [pathname]);
};
import { useUserContext } from "../context/UserContext.jsx";

export function useUser() {
    const { user } = useUserContext();
    return user;
}

export function useUserLoading() {
    const { loading } = useUserContext();
    return loading;
}

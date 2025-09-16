import { useUser } from "../../hooks/useUser"

function AdminHome() {
    const user = useUser();
    return (
        <p>{user?.first_name}</p>
    )

}

export default AdminHome
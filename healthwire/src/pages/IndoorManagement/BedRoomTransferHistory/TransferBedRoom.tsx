import { useEffect, useState } from 'react';
import { Spin } from 'antd';
import axios from 'axios';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';

import Breadcrumb from '../../../components/Breadcrumbs/Breadcrumb';
import { Base_url } from '../../../utils/Base_url';

const inputClass =
  'w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white';

function formatCurrentLocation(admit: any) {
  if (!admit) return '—';
  if (admit.allocationType === 'ward') {
    const ward = admit.wardId?.name || '';
    const bed = admit.bedDetailId?.bedNo != null ? `Bed ${admit.bedDetailId.bedNo}` : '';
    return [ward, bed].filter(Boolean).join(' / ') || '—';
  }
  if (admit.allocationType === 'room') {
    const room = admit.roomId?.name || '';
    const roomNo =
      admit.roomDetailId?.roomNo != null ? `Room ${admit.roomDetailId.roomNo}` : '';
    return [room, roomNo].filter(Boolean).join(' / ') || '—';
  }
  return '—';
}

const TransferBedRoom = () => {
  const { admitPatientId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [admit, setAdmit] = useState<any>(null);
  const [allocationType, setAllocationType] = useState<'ward' | 'room'>('ward');
  const [wardId, setWardId] = useState('');
  const [bedDetailId, setBedDetailId] = useState('');
  const [roomId, setRoomId] = useState('');
  const [roomDetailId, setRoomDetailId] = useState('');
  const [notes, setNotes] = useState('');
  const [wards, setWards] = useState<any[]>([]);
  const [beds, setBeds] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [roomDetails, setRoomDetails] = useState<any[]>([]);

  const patient = admit?.patientId;
  const patientLabel =
    patient && typeof patient === 'object'
      ? `${patient.name || '—'}${patient.mr ? ` (MR: ${patient.mr})` : ''}`
      : '—';

  useEffect(() => {
    if (!admitPatientId) {
      toast.error('Invalid admission');
      navigate('/bed-room-transfer-history');
      return;
    }

    const load = async () => {
      setLoading(true);
      try {
        const [admitRes, wardRes, roomRes] = await Promise.all([
          axios.get(`${Base_url}/apis/admitPatient/get/${admitPatientId}`),
          axios.get(`${Base_url}/apis/ward/get`, { params: { page: 1, limit: 500 } }),
          axios.get(`${Base_url}/apis/room/get`, { params: { page: 1, limit: 500 } }),
        ]);

        const data = admitRes.data?.data;
        if (!data) {
          toast.error('Admission record not found');
          navigate('/bed-room-transfer-history');
          return;
        }

        if (data.status === false) {
          toast.error('Patient is discharged — transfer not allowed');
          navigate('/bed-room-transfer-history');
          return;
        }

        setAdmit(data);
        const type = data.allocationType === 'room' ? 'room' : 'ward';
        setAllocationType(type);
        setWardId(data.wardId?._id || data.wardId || '');
        setBedDetailId(data.bedDetailId?._id || data.bedDetailId || '');
        setRoomId(data.roomId?._id || data.roomId || '');
        setRoomDetailId(data.roomDetailId?._id || data.roomDetailId || '');
        setWards(wardRes.data?.data || []);
        setRooms(roomRes.data?.data || []);
      } catch (error: any) {
        console.error(error);
        const msg =
          error?.response?.data?.message ||
          error?.response?.data?.error ||
          'Failed to load admission details';
        toast.error(msg);
        navigate('/bed-room-transfer-history');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [admitPatientId, navigate]);

  useEffect(() => {
    if (loading || allocationType !== 'ward' || !wardId) {
      if (!wardId) setBeds([]);
      return;
    }

    const currentBedId = admit?.bedDetailId?._id || admit?.bedDetailId || bedDetailId;

    axios
      .get(`${Base_url}/apis/bedDetail/get`, {
        params: { status: 'available', wardId, limit: 500 },
      })
      .then(async (res) => {
        let list = res.data?.data || [];
        if (currentBedId && !list.some((b: any) => String(b._id) === String(currentBedId))) {
          try {
            const cur = await axios.get(`${Base_url}/apis/bedDetail/get/${currentBedId}`);
            if (cur.data?.data) list = [cur.data.data, ...list];
          } catch {
            // ignore
          }
        }
        setBeds(list);
      })
      .catch(() => setBeds([]));
  }, [loading, allocationType, wardId, admit, bedDetailId]);

  useEffect(() => {
    if (loading || allocationType !== 'room' || !roomId) {
      if (!roomId) setRoomDetails([]);
      return;
    }

    const currentRoomDetailId = admit?.roomDetailId?._id || admit?.roomDetailId || roomDetailId;

    axios
      .get(`${Base_url}/apis/roomDetail/get`, {
        params: { status: 'available', roomId, limit: 500 },
      })
      .then(async (res) => {
        let list = res.data?.data || [];
        if (
          currentRoomDetailId &&
          !list.some((r: any) => String(r._id) === String(currentRoomDetailId))
        ) {
          try {
            const cur = await axios.get(`${Base_url}/apis/roomDetail/get/${currentRoomDetailId}`);
            if (cur.data?.data) list = [cur.data.data, ...list];
          } catch {
            // ignore
          }
        }
        setRoomDetails(list);
      })
      .catch(() => setRoomDetails([]));
  }, [loading, allocationType, roomId, admit, roomDetailId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!admitPatientId) return;

    if (allocationType === 'ward') {
      if (!wardId || !bedDetailId) {
        toast.error('Select ward and bed');
        return;
      }
    } else if (!roomId || !roomDetailId) {
      toast.error('Select room and room number');
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        allocationType,
        status: true,
        transferNotes: notes.trim(),
      };

      if (allocationType === 'ward') {
        payload.wardId = wardId;
        payload.bedDetailId = bedDetailId;
        payload.roomId = null;
        payload.roomDetailId = null;
      } else {
        payload.roomId = roomId;
        payload.roomDetailId = roomDetailId;
        payload.wardId = null;
        payload.bedDetailId = null;
      }

      const res = await axios.put(`${Base_url}/apis/admitPatient/update/${admitPatientId}`, payload);
      if (res.data?.status === 'ok') {
        toast.success('Bed/Room transferred successfully');
        navigate('/bed-room-transfer-history');
      } else {
        toast.error(res.data?.message || 'Transfer failed');
      }
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || error.response?.data?.error || 'Transfer failed',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Breadcrumb pageName="Transfer Bed / Room" />

      <div className="mb-4">
        <Link
          to="/bed-room-transfer-history"
          className="text-primary hover:underline text-sm font-medium"
        >
          ← Back to Transfer History
        </Link>
      </div>

      <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
        <div className="border-b border-stroke py-4 px-6.5 dark:border-strokedark">
          <h3 className="font-medium text-black dark:text-white">Transfer Bed / Room</h3>
        </div>

        <div className="p-6.5">
          {loading ? (
            <div className="flex justify-center py-16">
              <Spin size="large" />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mx-auto max-w-3xl space-y-5">
              <div className="rounded border border-stroke bg-gray-50 p-4 dark:border-strokedark dark:bg-meta-4">
                <p className="text-sm text-gray-600 dark:text-gray-300">Patient</p>
                <p className="font-medium text-black dark:text-white">{patientLabel}</p>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                  Admission No: <span className="font-medium">{admit?.admissionNo || '—'}</span>
                </p>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                  Current Location:{' '}
                  <span className="font-medium text-black dark:text-white">
                    {formatCurrentLocation(admit)}
                  </span>
                </p>
              </div>

              <div>
                <label className="mb-2.5 block text-black dark:text-white">Allocation Type</label>
                <div className="flex gap-10 pt-1">
                  {(['ward', 'room'] as const).map((t) => (
                    <label key={t} className="flex cursor-pointer items-center gap-2 capitalize">
                      <input
                        type="radio"
                        name="allocationType"
                        checked={allocationType === t}
                        onChange={() => setAllocationType(t)}
                      />
                      {t}
                    </label>
                  ))}
                </div>
              </div>

              {allocationType === 'ward' ? (
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div>
                    <label className="mb-2.5 block text-black dark:text-white">Ward</label>
                    <select
                      className={inputClass}
                      value={wardId}
                      onChange={(e) => {
                        setWardId(e.target.value);
                        setBedDetailId('');
                      }}
                    >
                      <option value="">Select ward</option>
                      {wards.map((w) => (
                        <option key={w._id} value={w._id}>
                          {w.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-2.5 block text-black dark:text-white">Bed #</label>
                    <select
                      className={inputClass}
                      value={bedDetailId}
                      onChange={(e) => setBedDetailId(e.target.value)}
                      disabled={!wardId}
                    >
                      <option value="">Select bed</option>
                      {beds.map((b) => (
                        <option key={b._id} value={b._id}>
                          {b.bedNo}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div>
                    <label className="mb-2.5 block text-black dark:text-white">Room Type</label>
                    <select
                      className={inputClass}
                      value={roomId}
                      onChange={(e) => {
                        setRoomId(e.target.value);
                        setRoomDetailId('');
                      }}
                    >
                      <option value="">Select room</option>
                      {rooms.map((r) => (
                        <option key={r._id} value={r._id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-2.5 block text-black dark:text-white">Room #</label>
                    <select
                      className={inputClass}
                      value={roomDetailId}
                      onChange={(e) => setRoomDetailId(e.target.value)}
                      disabled={!roomId}
                    >
                      <option value="">Select room #</option>
                      {roomDetails.map((r) => (
                        <option key={r._id} value={r._id}>
                          {r.roomNo}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div>
                <label className="mb-2.5 block text-black dark:text-white">Notes (optional)</label>
                <textarea
                  className={inputClass}
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Transfer reason or notes"
                />
              </div>

              <div className="flex justify-end gap-4 pt-2">
                <Link
                  to="/bed-room-transfer-history"
                  className="rounded border border-stroke px-6 py-3 text-sm font-medium text-black dark:text-white"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded bg-primary px-6 py-3 text-sm font-medium text-white disabled:opacity-60"
                >
                  {saving ? 'Transferring...' : 'Transfer'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  );
};

export default TransferBedRoom;

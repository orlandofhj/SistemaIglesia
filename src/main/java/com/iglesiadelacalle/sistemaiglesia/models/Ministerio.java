package com.iglesiadelacalle.sistemaiglesia.models;

import jakarta.persistence.*;
import java.util.List;
import java.util.ArrayList;

import java.time.ZoneId;
import java.time.LocalDateTime;

@Entity
@Table(name = "ministerio")
public class Ministerio {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer idMinisterio;

    @Column(length = 50, nullable = false)
    private String denominacion;

    @ManyToOne
    @JoinColumn(name = "id_responsable")
    private Persona responsable;

    public Persona getResponsable() { return responsable; }
    public void setResponsable(Persona responsable) { this.responsable = responsable; }

    @ManyToMany
    @JoinTable(
        name = "ministerio_integrantes",
        joinColumns = @JoinColumn(name = "id_ministerio"),
        inverseJoinColumns = @JoinColumn(name = "id_persona")
    )
    private List<Persona> integrantes;

    public Integer getIdMinisterio() { return idMinisterio; }
    public void setIdMinisterio(Integer idMinisterio) { this.idMinisterio = idMinisterio; }

    public String getDenominacion() { return denominacion; }
    public void setDenominacion(String denominacion) { this.denominacion = denominacion; }

    public List<Persona> getIntegrantes() { return integrantes; }
    public void setIntegrantes(List<Persona> integrantes) { this.integrantes = integrantes; }

    @Column(columnDefinition = "boolean default true")
    private Boolean activo = true;

    public Boolean getActivo() { return activo; }
    public void setActivo(Boolean activo) { this.activo = activo; }

    // (Opcional) Puedes conservar estas variables si las usas en reportes antiguos
    @Column(name = "fecha_creacion", updatable = false)
    private LocalDateTime fechaCreacion;

    @Column(name = "fecha_activacion")
    private LocalDateTime fechaActivacion;

    @Column(name = "fecha_inactivacion")
    private LocalDateTime fechaInactivacion;

    public LocalDateTime getFechaCreacion() { return fechaCreacion; }
    public void setFechaCreacion(LocalDateTime fechaCreacion) { this.fechaCreacion = fechaCreacion; }

    public LocalDateTime getFechaActivacion() { return fechaActivacion; }
    public void setFechaActivacion(LocalDateTime fechaActivacion) { this.fechaActivacion = fechaActivacion; }

    public LocalDateTime getFechaInactivacion() { return fechaInactivacion; }
    public void setFechaInactivacion(LocalDateTime fechaInactivacion) { this.fechaInactivacion = fechaInactivacion; }

    // ⚡ 1. ESTRUCTURA PARA EL HISTORIAL DEL EQUIPO
    @Embeddable
    public static class RegistroHistorial {
        private String nombre;
        private String cedula;
        private String estado;
        @Column(name = "fecha_hora")
        private LocalDateTime fechaHora;

        public String getNombre() { return nombre; }
        public void setNombre(String nombre) { this.nombre = nombre; }
        public String getCedula() { return cedula; }
        public void setCedula(String cedula) { this.cedula = cedula; }
        public String getEstado() { return estado; }
        public void setEstado(String estado) { this.estado = estado; }
        public LocalDateTime getFechaHora() { return fechaHora; }
        public void setFechaHora(LocalDateTime fechaHora) { this.fechaHora = fechaHora; }
    }

    @ElementCollection
    @CollectionTable(name = "ministerio_historial_equipo", joinColumns = @JoinColumn(name = "id_ministerio"))
    private List<RegistroHistorial> historialEquipo = new ArrayList<>();

    public List<RegistroHistorial> getHistorialEquipo() { return historialEquipo; }
    public void setHistorialEquipo(List<RegistroHistorial> historialEquipo) { this.historialEquipo = historialEquipo; }

    public void addHistorial(String nombre, String cedula, String estado) {
        RegistroHistorial reg = new RegistroHistorial();
        reg.setNombre(nombre);
        reg.setCedula(cedula);
        reg.setEstado(estado);
        reg.setFechaHora(LocalDateTime.now(ZoneId.of("America/Caracas")));
        this.historialEquipo.add(reg);
    }

    // ⚡ 2. NUEVA ESTRUCTURA PARA EL HISTORIAL GENERAL DEL MINISTERIO (ESTADOS)
    @Embeddable
    public static class RegistroEstado {
        private String accion;
        @Column(name = "fecha_hora")
        private LocalDateTime fechaHora;

        public String getAccion() { return accion; }
        public void setAccion(String accion) { this.accion = accion; }
        public LocalDateTime getFechaHora() { return fechaHora; }
        public void setFechaHora(LocalDateTime fechaHora) { this.fechaHora = fechaHora; }
    }

    @ElementCollection
    @CollectionTable(name = "ministerio_historial_estado", joinColumns = @JoinColumn(name = "id_ministerio"))
    private List<RegistroEstado> historialEstados = new ArrayList<>();

    public List<RegistroEstado> getHistorialEstados() { return historialEstados; }
    public void setHistorialEstados(List<RegistroEstado> historialEstados) { this.historialEstados = historialEstados; }

    public void addHistorialEstado(String accion) {
        RegistroEstado reg = new RegistroEstado();
        reg.setAccion(accion);
        reg.setFechaHora(LocalDateTime.now(ZoneId.of("America/Caracas")));
        this.historialEstados.add(reg);
    }

    @jakarta.persistence.PrePersist
    protected void onCreate() {
        LocalDateTime ahora = LocalDateTime.now(ZoneId.of("America/Caracas"));
        this.fechaCreacion = ahora;
        
        // Registramos el evento de creación en el historial
        RegistroEstado reg = new RegistroEstado();
        reg.setAccion("Ministerio Creado");
        reg.setFechaHora(ahora);
        this.historialEstados.add(reg);

        if (this.activo != null && this.activo) {
            this.fechaActivacion = ahora;
        } else {
            this.fechaInactivacion = ahora;
        }
    }
}